// As métricas seguem o docs/metricas.md (dicionário de métricas).

// Segundos trabalhados em um turno = (fim − início) − soma das pausas.
// Turno ou pausa ainda aberto usa o "agora".
export function workedSeconds(shift, breaks = [], now = Date.now()) {
  const start = new Date(shift.started_at).getTime()
  const end = shift.ended_at ? new Date(shift.ended_at).getTime() : now
  const paused = breaks.reduce((acc, b) => {
    const bs = new Date(b.started_at).getTime()
    const be = b.ended_at ? new Date(b.ended_at).getTime() : now
    return acc + Math.max(0, be - bs)
  }, 0)
  return Math.max(0, (end - start - paused) / 1000)
}

// Jornada (fim − início), pausas e horas trabalhadas (jornada − pausas) de um turno, em segundos.
export function shiftTimes(shift, breaks = [], now = Date.now()) {
  const start = new Date(shift.started_at).getTime()
  const end = shift.ended_at ? new Date(shift.ended_at).getTime() : now
  const span = Math.max(0, (end - start) / 1000)
  const worked = workedSeconds(shift, breaks, now)
  return { span, paused: Math.max(0, span - worked), worked, pauses: breaks.length }
}

// Avaliação do dia em % da meta: Ruim < 75% · Regular 75–<100% · Bom 100–<133% · Ótimo ≥ 133%
export function rating(perHour, goal) {
  if (!goal || !perHour) return null
  const p = perHour / goal
  if (p >= 1.33) return { key: 'otimo', label: 'Ótimo' }
  if (p >= 1.0) return { key: 'bom', label: 'Bom' }
  if (p >= 0.75) return { key: 'regular', label: 'Regular' }
  return { key: 'ruim', label: 'Ruim' }
}

// Junta turnos, pausas, ganhos e despesas em totais (geral e por dia).
export function summarize({ shifts = [], breaks = [], earnings = [], expenses = [] }, goal) {
  const byShift = {}
  breaks.forEach((b) => { (byShift[b.shift_id] ||= []).push(b) })
  const days = {}
  const day = (d) => (days[d] ||= { date: d, seconds: 0, span: 0, paused: 0, pauses: 0, revenue: 0, expenses: 0 })
  shifts.forEach((s) => {
    const t = shiftTimes(s, byShift[s.id])
    const d = day(s.work_date)
    d.seconds += t.worked; d.span += t.span; d.paused += t.paused; d.pauses += t.pauses
  })
  earnings.forEach((e) => { day(e.work_date).revenue += Number(e.amount) })
  expenses.forEach((x) => { day(x.work_date).expenses += Number(x.amount) })
  const list = Object.values(days).sort((a, b) => b.date.localeCompare(a.date))
  list.forEach((d) => {
    d.perHour = d.seconds > 0 ? d.revenue / (d.seconds / 3600) : null
    d.rating = rating(d.perHour, goal)
  })
  const total = list.reduce(
    (t, d) => ({ seconds: t.seconds + d.seconds, span: t.span + d.span, paused: t.paused + d.paused, pauses: t.pauses + d.pauses,
      revenue: t.revenue + d.revenue, expenses: t.expenses + d.expenses }),
    { seconds: 0, span: 0, paused: 0, pauses: 0, revenue: 0, expenses: 0 }
  )
  total.profit = total.revenue - total.expenses
  total.perHour = total.seconds > 0 ? total.revenue / (total.seconds / 3600) : null
  total.rating = rating(total.perHour, goal)
  total.days = list.filter((d) => d.revenue > 0 || d.seconds > 0).length
  total.daysWithHours = list.filter((d) => d.seconds > 0).length
  return { total, days: list }
}
