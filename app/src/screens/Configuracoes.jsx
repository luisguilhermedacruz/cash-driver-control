import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { parseMoney } from '../lib/format'
import { Header, ErrorMsg } from '../ui'

// Configurações: nome e meta. (O plano NÃO pode ser alterado aqui: o banco bloqueia.)
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
      <Header title="Configurações" onBack={() => go('hoje')} onMenu={openMenu} initial={name[0]?.toUpperCase()} />
      <form className="page" onSubmit={save}>
        <label className="field"><span>Seu nome</span><input value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" /></label>
        <label className="field"><span>Meta de ganhos por hora</span>
          <div className="money-input"><span>R$</span><input inputMode="decimal" value={goal} onChange={(e) => setGoal(e.target.value)} /></div>
        </label>
        <span className="muted small">E-mail: {user.email} · Plano: {user.plan || 'free'}</span>
        <ErrorMsg error={error} />
        {ok && <p className="info" role="status">Salvo!</p>}
        <div className="grow" />
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Salvando…' : 'Salvar'}</button>
      </form>
    </>
  )
}
