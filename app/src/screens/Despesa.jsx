import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { localDate, parseMoney } from '../lib/format'
import { Header, ErrorMsg } from '../ui'

const FUELS = [['gasolina', 'Gasolina'], ['etanol', 'Etanol'], ['gnv', 'GNV'], ['eletrico', 'Elétrico']]

// Tela 6 · Nova despesa. Despesas são lançadas NA HORA, quantas vezes precisar.
export default function Despesa({ user, name, go, openMenu }) {
  const [cats, setCats] = useState([])
  const [open, setOpen] = useState(null)
  const [cat, setCat] = useState(null)
  const [fuel, setFuel] = useState('gasolina')
  const [amount, setAmount] = useState('')
  const [desc, setDesc] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    (async () => {
      const [c, s] = await Promise.all([
        supabase.from('expense_categories').select('*').eq('is_active', true).order('id'),
        supabase.from('shifts').select('*').is('ended_at', null).maybeSingle(),
      ])
      if (c.error) { setError(c.error.message); return }
      setCats(c.data); setCat(c.data[0]?.id ?? null); setOpen(s.data)
    })()
  }, [])

  const current = cats.find((c) => c.id === cat)
  const isFuel = current?.group_code === 'combustivel'

  async function save(e) {
    e.preventDefault()
    const v = parseMoney(amount)
    if (!v || Number.isNaN(v) || v <= 0) { setError('Digite um valor maior que zero, ex.: 100,00'); return }
    setBusy(true); setError('')
    const { error } = await supabase.from('expenses').insert({
      user_id: user.id,
      work_date: open ? open.work_date : localDate(),
      shift_id: open ? open.id : null,
      category_id: cat,
      amount: v,
      description: desc.trim() || null,
      fuel_type: isFuel ? fuel : null,
    })
    setBusy(false)
    if (error) setError(error.message)
    else go('hoje')
  }

  return (
    <>
      <Header title="Nova despesa" onBack={() => go('hoje')} onMenu={openMenu} initial={name[0]?.toUpperCase()} avatar={user.avatar_url} />
      <form className="page" onSubmit={save}>
        <fieldset className="stack-8">
          <legend className="strong">Tipo</legend>
          <div className="chips">
            {cats.map((c) => (
              <button type="button" key={c.id} className={c.id === cat ? 'chip chip-on' : 'chip'} aria-pressed={c.id === cat} onClick={() => setCat(c.id)}>{c.name}</button>
            ))}
          </div>
        </fieldset>
        {isFuel && (
          <fieldset className="stack-8">
            <legend className="strong">Combustível</legend>
            <div className="segmented">
              {FUELS.map(([k, l]) => (
                <button type="button" key={k} className={fuel === k ? 'seg seg-on' : 'seg'} aria-pressed={fuel === k} onClick={() => setFuel(k)}>{l}</button>
              ))}
            </div>
          </fieldset>
        )}
        <label className="field">
          <span>Valor</span>
          <div className="money-input"><span>R$</span><input inputMode="decimal" placeholder="0,00" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
        </label>
        <label className="field">
          <span>Descrição (opcional)</span>
          <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Ex.: posto da avenida" />
        </label>
        <span className="muted small">{open ? 'Vai ser ligada ao turno em andamento.' : 'Sem turno aberto: entra como despesa do dia de hoje.'}</span>
        <ErrorMsg error={error} />
        <div className="grow" />
        <button className="btn btn-primary" disabled={busy || !cat}>{busy ? 'Salvando…' : 'Salvar despesa'}</button>
      </form>
    </>
  )
}
