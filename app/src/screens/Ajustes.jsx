import { useEffect, useState } from 'react'
import { localDate, money, dayLabel } from '../lib/format'
import { loadPeriod } from '../lib/data'
import { Header, Icon, ErrorMsg } from '../ui'

// Primeiro e último dia do mês de uma data (AAAA-MM-DD).
function monthRange(ref) {
  const [y, m] = ref.split('-').map(Number)
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const mm = String(m).padStart(2, '0')
  return [`${y}-${mm}-01`, `${y}-${mm}-${last}`]
}
const moveMonth = (ref, dir) => {
  const [y, m] = ref.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1 + dir, 1)).toISOString().slice(0, 10)
}

// Ajustes · lista os dias do mês que têm lançamentos. Tocar num dia abre a tela para corrigir.
export default function Ajustes({ user, name, go, openMenu, month }) {
  const today = localDate()
  const [ref, setRef] = useState(month || today)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [other, setOther] = useState(today)
  const [start, end] = monthRange(ref)

  useEffect(() => {
    let alive = true
    setData(null); setError('')
    loadPeriod(start, end).then((d) => alive && setData(d)).catch((e) => alive && setError(e.message))
    return () => { alive = false }
  }, [start, end])

  // Junta tudo por dia: quantas jornadas, quanto ganhou, quanto gastou.
  const days = {}
  const day = (d) => (days[d] ||= { date: d, shifts: 0, revenue: 0, expenses: 0 })
  data?.shifts.forEach((s) => { day(s.work_date).shifts += 1 })
  data?.earnings.forEach((e) => { day(e.work_date).revenue += Number(e.amount) })
  data?.expenses.forEach((x) => { day(x.work_date).expenses += Number(x.amount) })
  const list = Object.values(days).sort((a, b) => b.date.localeCompare(a.date))
  const open = (date) => go('ajuste-dia', { date, month: ref })

  return (
    <>
      <Header title="Ajustes" onBack={() => go('hoje')} onMenu={openMenu} initial={name[0]?.toUpperCase()} avatar={user.avatar_url} />
      <main className="page">
        <p className="muted small">Lançou algo errado ou esqueceu de lançar? Escolha o dia para editar, apagar ou adicionar.</p>

        <div className="row-between">
          <button className="icon-btn" onClick={() => setRef(moveMonth(ref, -1))} aria-label="Mês anterior"><Icon name="left" /></button>
          <span className="strong">{dayLabel(start, { month: 'long', year: 'numeric' })}</span>
          <button className="icon-btn" onClick={() => setRef(moveMonth(ref, 1))} disabled={end >= today} aria-label="Próximo mês"><Icon name="right" /></button>
        </div>

        <ErrorMsg error={error} />
        {!data && !error && <p className="muted">Carregando…</p>}
        {data && list.length === 0 && <p className="muted">Nenhum lançamento nesse mês.</p>}
        {list.length > 0 && (
          <div className="card list">
            {list.map((d) => (
              <button key={d.date} className="list-row as-button" onClick={() => open(d.date)}>
                <span>{dayLabel(d.date, { weekday: 'short', day: '2-digit', month: '2-digit' })}</span>
                <span className="row-8 muted small">
                  {d.shifts > 0 && `${d.shifts} ${d.shifts === 1 ? 'jornada' : 'jornadas'} · `}{money(d.revenue)}
                  {d.expenses > 0 && ` · -${money(d.expenses)}`}
                  <Icon name="right" size={18} />
                </span>
              </button>
            ))}
          </div>
        )}

        <div className="card stack-8">
          <span className="strong">Adicionar em outro dia</span>
          <span className="muted small">Para um dia que ainda não tem nada lançado.</span>
          <label className="field"><span>Dia</span>
            <input type="date" value={other} max={today} onChange={(e) => setOther(e.target.value)} />
          </label>
          <button className="btn btn-secondary" onClick={() => other && open(other)} disabled={!other}>
            <Icon name="plus" size={20} /> Abrir {other ? dayLabel(other, { day: '2-digit', month: '2-digit' }) : 'dia'}
          </button>
        </div>
      </main>
    </>
  )
}

