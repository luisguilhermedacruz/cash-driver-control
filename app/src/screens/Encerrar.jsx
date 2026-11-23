import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { money, hoursLabel, timeLabel, parseMoney } from '../lib/format'
import { workedSeconds, rating } from '../lib/metrics'
import { Header, Badge, Icon, ErrorMsg } from '../ui'

const MAIN = ['Uber', '99', 'InDriver']

// Tela 5 · Encerrar turno. Ganhos são lançados POR TURNO, todos de uma vez (decisão de 23/11).
export default function Encerrar({ user, name, go, openMenu, shiftId }) {
  const [endAt] = useState(() => new Date().toISOString()) // o fim do turno é o momento em que apertou "Encerrar"
  const [shift, setShift] = useState(null)
  const [breaks, setBreaks] = useState([])
  const [platforms, setPlatforms] = useState([])
  const [values, setValues] = useState({})
  const [showOthers, setShowOthers] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    (async () => {
      const [sh, br, pl] = await Promise.all([
        supabase.from('shifts').select('*').eq('id', shiftId).single(),
        supabase.from('breaks').select('*').eq('shift_id', shiftId),
        supabase.from('platforms').select('*').eq('is_active', true).order('id'),
      ])
      if (sh.error || br.error || pl.error) { setError((sh.error || br.error || pl.error).message); return }
      setShift(sh.data); setBreaks(br.data); setPlatforms(pl.data)
    })()
  }, [shiftId])

  if (!shift) return (<><Header title="Encerrar turno" onBack={() => go('hoje')} onMenu={openMenu} initial={name[0]?.toUpperCase()} /><main className="page"><ErrorMsg error={error} /><p className="muted">Carregando…</p></main></>)

  const closedBreaks = breaks.map((b) => (b.ended_at ? b : { ...b, ended_at: endAt }))
  const seconds = workedSeconds({ ...shift, ended_at: endAt }, closedBreaks)
  const parsed = Object.fromEntries(platforms.map((p) => [p.id, parseMoney(values[p.id])]))
  const invalid = Object.values(parsed).some((v) => Number.isNaN(v) || (v !== null && v < 0))
  const total = Object.values(parsed).reduce((a, v) => a + (v > 0 ? v : 0), 0)
  const perHour = seconds > 0 ? total / (seconds / 3600) : null
  const main = platforms.filter((p) => MAIN.includes(p.name))
  const others = platforms.filter((p) => !MAIN.includes(p.name))

  async function save() {
    if (invalid) { setError('Confira os valores: use só números, ex.: 320,50'); return }
    setBusy(true); setError('')
    const open = breaks.find((b) => !b.ended_at)
    if (open) {
      const r = await supabase.from('breaks').update({ ended_at: endAt }).eq('id', open.id)
      if (r.error) { setError(r.error.message); setBusy(false); return }
    }
    const r1 = await supabase.from('shifts').update({ ended_at: endAt }).eq('id', shift.id)
    if (r1.error) {
      setError(r1.error.message.includes('check') ? 'O turno passou de 24 horas. Ajuste o horário com o suporte.' : r1.error.message)
      setBusy(false); return
    }
    // Campo em branco NÃO grava nada (vazio ≠ zero).
    const rows = platforms.filter((p) => parsed[p.id] > 0).map((p) => ({
      user_id: user.id, work_date: shift.work_date, shift_id: shift.id, platform_id: p.id, amount: parsed[p.id],
    }))
    if (rows.length) {
      const r2 = await supabase.from('earnings').insert(rows)
      if (r2.error) { setError(r2.error.message); setBusy(false); return }
    }
    go('hoje')
  }

  const field = (p) => (
    <label key={p.id} className="field">
      <span>{p.name}</span>
      <div className="money-input"><span>R$</span>
        <input inputMode="decimal" placeholder="0,00" value={values[p.id] || ''} onChange={(e) => setValues({ ...values, [p.id]: e.target.value })} />
      </div>
    </label>
  )

  return (
    <>
      <Header title="Encerrar turno" onBack={() => go('hoje')} onMenu={openMenu} initial={name[0]?.toUpperCase()} />
      <main className="page">
        <div className="card stack-2">
          <span className="strong big">{timeLabel(shift.started_at)} → {timeLabel(endAt)}</span>
          <span className="muted small">{hoursLabel(seconds)} trabalhadas · {breaks.length} {breaks.length === 1 ? 'pausa' : 'pausas'}</span>
        </div>
        <span className="strong">Quanto você ganhou em cada plataforma?</span>
        {main.map(field)}
        <span className="muted small">Não rodou em alguma? Deixe em branco.</span>
        {others.length > 0 && !showOthers && (
          <button className="link-btn left" onClick={() => setShowOthers(true)}><Icon name="plus" size={18} /> Particular ou entrega</button>
        )}
        {showOthers && others.map(field)}
        <ErrorMsg error={error} />
        <div className="grow" />
        <div className="row-between">
          <span className="stack-2"><span className="muted small">Total do turno</span><span className="strong big">{money(total)} · {perHour ? money(perHour) + '/h' : '—'}</span></span>
          <Badge r={rating(perHour, user.hourly_goal)} />
        </div>
        <button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? 'Salvando…' : 'Salvar e encerrar'}</button>
      </main>
    </>
  )
}
