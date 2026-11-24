import { useEffect, useState } from 'react'
import { loadPeriod } from '../lib/data'
import { localDate, addDays, money, hoursLabel, timeLabel, dayLabel } from '../lib/format'
import { summarize, workedSeconds } from '../lib/metrics'
import { Header, Stat, Badge, Icon, ErrorMsg } from '../ui'

const TABS = [['dia', 'Dia'], ['semana', 'Semana'], ['mes', 'Mês'], ['datas', 'Datas']]

// Intervalo [início, fim] de cada aba, a partir de uma data de referência.
function range(tab, ref, from, to) {
  if (tab === 'dia') return [ref, ref]
  if (tab === 'semana') {
    const dow = new Date(ref + 'T12:00:00Z').getUTCDay() // 0 = domingo
    const mon = addDays(ref, -((dow + 6) % 7)) // semana de segunda a domingo
    return [mon, addDays(mon, 6)]
  }
  if (tab === 'mes') {
    const [y, m] = ref.split('-').map(Number)
    const last = new Date(Date.UTC(y, m, 0)).getUTCDate()
    return [`${y}-${String(m).padStart(2, '0')}-01`, `${y}-${String(m).padStart(2, '0')}-${last}`]
  }
  return [from, to]
}

function shift(tab, ref, dir) {
  if (tab === 'dia') return addDays(ref, dir)
  if (tab === 'semana') return addDays(ref, 7 * dir)
  const [y, m] = ref.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1 + dir, 1))
  return d.toISOString().slice(0, 10)
}

// Telas 7 e 10 a 14 · Relatórios: Dia, Semana, Mês e Datas (período livre).
export default function Relatorios({ user, name, go, openMenu, tab: initialTab = 'semana', date }) {
  const today = localDate()
  const [tab, setTab] = useState(initialTab)
  const [ref, setRef] = useState(date || today)
  const [from, setFrom] = useState(addDays(today, -6))
  const [to, setTo] = useState(today)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [start, end] = range(tab, ref, from, to)

  useEffect(() => {
    let alive = true
    setData(null); setError('')
    if (start > end) { setError('A data inicial precisa ser antes da final.'); return }
    loadPeriod(start, end).then((d) => alive && setData(d)).catch((e) => alive && setError(e.message))
    return () => { alive = false }
  }, [start, end])

  const sum = data ? summarize(data, user.hourly_goal) : null
  const label =
    tab === 'dia' ? dayLabel(start)
    : tab === 'mes' ? dayLabel(start, { month: 'long', year: 'numeric' })
    : `${dayLabel(start, { day: 'numeric', month: 'short' })} a ${dayLabel(end, { day: 'numeric', month: 'short', year: 'numeric' })}`

  const byPlatform = {}
  data?.earnings.forEach((e) => { const n = e.platforms?.name || '—'; byPlatform[n] = (byPlatform[n] || 0) + Number(e.amount) })
  const byGroup = {}
  data?.expenses.forEach((x) => { const n = x.expense_categories?.name || '—'; byGroup[n] = (byGroup[n] || 0) + Number(x.amount) })

  return (
    <>
      <Header title="Relatórios" onBack={() => go('hoje')} onMenu={openMenu} initial={name[0]?.toUpperCase()} avatar={user.avatar_url} />
      <main className="page">
        <div className="segmented" role="tablist">
          {TABS.map(([k, l]) => (
            <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'seg seg-accent' : 'seg'} onClick={() => { setTab(k); if (k !== 'datas') setRef(today) }}>{l}</button>
          ))}
        </div>

        {tab === 'datas' ? (
          <div className="grid-2">
            <label className="field"><span>De</span><input type="date" value={from} max={today} onChange={(e) => setFrom(e.target.value)} /></label>
            <label className="field"><span>Até</span><input type="date" value={to} max={today} onChange={(e) => setTo(e.target.value)} /></label>
          </div>
        ) : (
          <div className="row-between">
            <button className="icon-btn" onClick={() => setRef(shift(tab, ref, -1))} aria-label="Período anterior"><Icon name="left" /></button>
            <span className="strong center-text">{label}</span>
            <button className="icon-btn" onClick={() => setRef(shift(tab, ref, 1))} disabled={end >= today} aria-label="Próximo período"><Icon name="right" /></button>
          </div>
        )}

        <ErrorMsg error={error} />
        {!data && !error && <p className="muted">Carregando…</p>}

        {sum && (
          <>
            <div className="row-between"><span className="muted small">{sum.total.days} {sum.total.days === 1 ? 'dia trabalhado' : 'dias trabalhados'}</span><Badge r={sum.total.rating} /></div>
            <div className="grid-2">
              <Stat label="Receita" value={money(sum.total.revenue)} />
              <Stat label="Despesas" value={money(sum.total.expenses)} />
              <Stat label="Lucro" value={money(sum.total.profit)} />
              <Stat label="R$/hora" value={sum.total.perHour ? money(sum.total.perHour) : '—'} sub={`${hoursLabel(sum.total.seconds)} · meta ${money(user.hourly_goal)}`} />
            </div>

            {tab === 'dia' && data.shifts.length > 0 && (
              <div className="stack-8">
                <span className="muted small">Turnos</span>
                {data.shifts.map((s) => {
                  const br = data.breaks.filter((b) => b.shift_id === s.id)
                  return (
                    <div key={s.id} className="card row-between">
                      <span className="stack-2"><span>{timeLabel(s.started_at)} → {s.ended_at ? timeLabel(s.ended_at) : 'em andamento'}</span><span className="muted small">{br.length} {br.length === 1 ? 'pausa' : 'pausas'}</span></span>
                      <span className="num">{hoursLabel(workedSeconds(s, br))}</span>
                    </div>
                  )
                })}
              </div>
            )}

            {Object.keys(byPlatform).length > 0 && (
              <div className="card list">
                <span className="muted small">Ganhos por plataforma</span>
                {Object.entries(byPlatform).sort((a, b) => b[1] - a[1]).map(([n, v]) => (
                  <div key={n} className="list-row"><span>{n}</span><span className="num">{money(v)} <span className="muted small">{Math.round((v / sum.total.revenue) * 100)}%</span></span></div>
                ))}
              </div>
            )}
            {Object.keys(byGroup).length > 0 && (
              <div className="card list">
                <span className="muted small">Despesas por tipo</span>
                {Object.entries(byGroup).sort((a, b) => b[1] - a[1]).map(([n, v]) => (
                  <div key={n} className="list-row"><span>{n}</span><span className="num">{money(v)}</span></div>
                ))}
              </div>
            )}

            {tab !== 'dia' && sum.days.length > 0 && (
              <div className="card list">
                <span className="muted small">Dias (toque para ver o detalhe)</span>
                {sum.days.map((d) => (
                  <button key={d.date} className="list-row as-button" onClick={() => { setTab('dia'); setRef(d.date) }}>
                    <span>{dayLabel(d.date, { weekday: 'short', day: '2-digit', month: '2-digit' })}</span>
                    <span className="row-8"><span className="muted small">{d.perHour ? money(d.perHour) + '/h' : money(d.revenue)}</span><Badge r={d.rating} /></span>
                  </button>
                ))}
              </div>
            )}
            {sum.days.length === 0 && <p className="muted">Nenhum lançamento nesse período.</p>}
            <button className="btn btn-secondary" disabled title="Em breve">Compartilhar PDF (em breve)</button>
          </>
        )}
      </main>
    </>
  )
}
