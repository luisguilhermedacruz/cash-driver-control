import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { parseMoney } from '../lib/format'
import { Header, ErrorMsg, Icon } from '../ui'

// Grupos fixos de despesa (os mesmos do banco). Toda despesa nova PRECISA cair num deles,
// para os relatórios continuarem somando certo (ex.: tudo que é "veículo" junto).
const GROUPS = [
  ['combustivel', 'Combustível'], ['veiculo', 'Veículo'], ['alimentacao', 'Alimentação'],
  ['plataforma', 'Plataforma'], ['telefonia', 'Telefonia'], ['impostos', 'Impostos e taxas'], ['outros', 'Outros'],
]
const groupName = (code) => GROUPS.find(([k]) => k === code)?.[1] || code
const same = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase()

// Configurações: nome e meta, plataformas próprias e tipos de despesa próprios.
// (O plano NÃO pode ser alterado aqui: o banco bloqueia.)
export default function Configuracoes({ user, name, go, openMenu, onSaved }) {
  const [fullName, setFullName] = useState(user.full_name || '')
  const [goal, setGoal] = useState(String(user.hourly_goal ?? '').replace('.', ','))
  const [error, setError] = useState('')
  const [ok, setOk] = useState(false)
  const [busy, setBusy] = useState(false)

  async function save(e) {
    e.preventDefault()
    const g = parseMoney(goal)
    if (!g || Number.isNaN(g) || g <= 0) { setError('A meta precisa ser maior que zero.'); return }
    setBusy(true); setError(''); setOk(false)
    const { error } = await supabase.from('profiles').update({ full_name: fullName.trim() || null, hourly_goal: g }).eq('id', user.id)
    setBusy(false)
    if (error) setError(error.message)
    else { setOk(true); onSaved() }
  }

  return (
    <>
      <Header title="Configurações" onBack={() => go('hoje')} onMenu={openMenu} initial={name[0]?.toUpperCase()} avatar={user.avatar_url} />
      <main className="page">
        <form className="card stack-12" onSubmit={save}>
          <span className="strong">Seus dados</span>
          <label className="field"><span>Seu nome</span><input value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" /></label>
          <label className="field"><span>Meta de ganhos por hora</span>
            <div className="money-input"><span>R$</span><input inputMode="decimal" value={goal} onChange={(e) => setGoal(e.target.value)} /></div>
          </label>
          <span className="muted small">E-mail: {user.email} · Plano: {user.plan || 'free'}</span>
          <ErrorMsg error={error} />
          {ok && <p className="info" role="status">Salvo!</p>}
          <button className="btn btn-primary" disabled={busy}>{busy ? 'Salvando…' : 'Salvar'}</button>
        </form>

        <Catalog user={user} table="platforms" title="Plataformas"
          help="Além das padrão, adicione onde mais você trabalha (ex.: Lalamove). Elas aparecem ao encerrar o turno, em Outras plataformas." />
        <Catalog user={user} table="expense_categories" title="Tipos de despesa" withGroup
          help="Crie tipos com o seu nome (ex.: Troca de óleo). Cada um precisa entrar num grupo padrão, para os relatórios somarem certo." />
      </main>
    </>
  )
}

// Lista as padrão (só leitura) + as do motorista, com Adicionar e Remover.
// Remover = esconder (is_active = false). Não apagamos de verdade porque lançamentos antigos
// apontam para ela: apagar quebraria o histórico.
function Catalog({ user, table, title, help, withGroup }) {
  const [items, setItems] = useState([])
  const [newName, setNewName] = useState('')
  const [group, setGroup] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const r = await supabase.from(table).select('*').order('id')
    if (r.error) setError(r.error.message); else setItems(r.data)
  }, [table])
  useEffect(() => { load() }, [load])

  const defaults = items.filter((i) => !i.user_id)
  const mine = items.filter((i) => i.user_id && i.is_active)

  async function add(e) {
    e.preventDefault()
    const n = newName.trim()
    setError('')
    if (n.length < 2) { setError('Digite um nome com pelo menos 2 letras.'); return }
    if (withGroup && !group) { setError('Escolha em qual grupo esse tipo de despesa entra.'); return }
    if (items.some((i) => (i.is_active || !i.user_id) && same(i.name, n))) { setError('Já existe um item com esse nome.'); return }
    setBusy(true)
    const hidden = items.find((i) => i.user_id && !i.is_active && same(i.name, n))
    const fields = withGroup ? { group_code: group } : {}
    // Se a pessoa já tinha criado e removido esse nome, só reativa (o banco não deixa nome repetido).
    const r = hidden
      ? await supabase.from(table).update({ ...fields, is_active: true }).eq('id', hidden.id)
      : await supabase.from(table).insert({ ...fields, name: n, user_id: user.id })
    setBusy(false)
    if (r.error) { setError(r.error.message); return }
    setNewName(''); setGroup(''); load()
  }

  async function hide(item) {
    const r = await supabase.from(table).update({ is_active: false }).eq('id', item.id)
    if (r.error) setError(r.error.message); else load()
  }

  return (
    <section className="card stack-12">
      <span className="strong">{title}</span>
      <span className="muted small">{help}</span>
      <div className="chips">
        {defaults.map((d) => <span key={d.id} className="chip-static">{d.name}</span>)}
      </div>
      {mine.length > 0 && (
        <div>
          {mine.map((m) => (
            <div key={m.id} className="settings-item">
              <span className="stack-2"><span>{m.name}</span>{withGroup && <span className="muted small">{groupName(m.group_code)}</span>}</span>
              <button className="icon-btn" aria-label={`Remover ${m.name}`} onClick={() => hide(m)}><Icon name="trash" size={20} /></button>
            </div>
          ))}
        </div>
      )}
      <form className="stack-8" onSubmit={add}>
        <div className={withGroup ? 'stack-8' : 'add-row'}>
          <label className="field"><span>Novo nome</span><input value={newName} onChange={(e) => setNewName(e.target.value)} maxLength={40} /></label>
          {withGroup && (
            <label className="field"><span>Grupo</span>
              <select value={group} onChange={(e) => setGroup(e.target.value)} required>
                <option value="" disabled>Escolha o grupo</option>
                {GROUPS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </label>
          )}
          <button className={withGroup ? 'btn btn-secondary' : 'btn btn-secondary btn-small'} disabled={busy}>
            <Icon name="plus" size={20} /> Adicionar
          </button>
        </div>
      </form>
      <ErrorMsg error={error} />
    </section>
  )
}
