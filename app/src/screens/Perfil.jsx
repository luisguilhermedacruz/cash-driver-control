import { useEffect, useState } from 'react'
import { loadPeriod } from '../lib/data'
import { money, dayLabel } from '../lib/format'
import { summarize } from '../lib/metrics'
import { Header, Stat, ErrorMsg } from '../ui'

// Tela 9 · Perfil do motorista. Tudo aqui é CALCULADO a partir dos lançamentos (nada novo no banco).
export default function Perfil({ user, name, go, openMenu }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => { loadPeriod('2000-01-01', '2100-12-31').then(setData).catch((e) => setError(e.message)) }, [])

  let info = null
  if (data) {
    const sum = summarize(data, user.hourly_goal)
    const worked = sum.days.filter((d) => d.revenue > 0)
    const best = [...worked].sort((a, b) => b.revenue - a.revenue)[0]
    // "Dia mais eficiente": maior R$/hora entre os dias com pelo menos 4h (evita dia de 1 corrida só)
    const eff = sum.days.filter((d) => d.seconds >= 4 * 3600 && d.perHour).sort((a, b) => b.perHour - a.perHour)[0]
    const months = {}
    worked.forEach((d) => { const m = d.date.slice(0, 7); months[m] = (months[m] || 0) + d.revenue })
    const bestMonth = Object.entries(months).sort((a, b) => b[1] - a[1])[0]
    const plat = {}
    data.earnings.forEach((e) => { const n = e.platforms?.name; if (n) plat[n] = (plat[n] || 0) + Number(e.amount) })
    const topPlat = Object.entries(plat).sort((a, b) => b[1] - a[1])[0]
    let dayH = 0, nightH = 0
    data.shifts.forEach((s) => {
      const h = Number(new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: 'numeric', hourCycle: 'h23' }).format(new Date(s.started_at)))
      if (h >= 6 && h < 18) dayH++; else nightH++
    })
    info = { best, eff, bestMonth, topPlat, period: data.shifts.length ? (dayH >= nightH ? 'Trabalha mais de dia' : 'Trabalha mais à noite') : null, days: worked.length }
  }
  const since = user.created_at ? dayLabel(user.created_at.slice(0, 10), { month: 'short', year: 'numeric' }) : ''

  return (
    <>
      <Header title="Perfil" onBack={() => go('hoje')} onMenu={openMenu} initial={name[0]?.toUpperCase()} avatar={user.avatar_url} />
      <main className="page">
        <div className="profile-head">
          {user.avatar_url ? <img src={user.avatar_url} alt="" className="avatar-big" referrerPolicy="no-referrer" /> : <span className="avatar-big">{name[0]?.toUpperCase()}</span>}
          <span className="strong big">{user.full_name || name}</span>
          <span className="muted small">Motorista de aplicativo · desde {since}</span>
          {info && (
            <div className="chips center">
              {info.period && <span className="chip-static">{info.period}</span>}
              {info.topPlat && <span className="chip-static">Mais forte: {info.topPlat[0]}</span>}
            </div>
          )}
        </div>
        <ErrorMsg error={error} />
        {!data && !error && <p className="muted">Carregando…</p>}
        {info && (
          <>
            <div className="card stack-2"><span className="muted small">Melhor dia</span><span className="strong big">{info.best ? money(info.best.revenue) : '—'}</span><span className="muted small">{info.best ? dayLabel(info.best.date, { day: '2-digit', month: '2-digit', year: 'numeric', weekday: 'long' }) : 'Ainda sem lançamentos'}</span></div>
            <div className="card stack-2"><span className="muted small">Dia mais eficiente (pelo menos 4h)</span><span className="strong big">{info.eff ? money(info.eff.perHour) + '/h' : '—'}</span><span className="muted small">{info.eff ? dayLabel(info.eff.date, { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Ainda sem dias com 4h ou mais'}</span></div>
            <div className="card stack-2"><span className="muted small">Melhor mês</span><span className="strong big">{info.bestMonth ? money(info.bestMonth[1]) : '—'}</span><span className="muted small">{info.bestMonth ? dayLabel(info.bestMonth[0] + '-01', { month: 'long', year: 'numeric' }) : ''}</span></div>
            <div className="grid-2"><Stat label="Dias trabalhados" value={info.days} /><Stat label="Sua meta" value={money(user.hourly_goal) + '/h'} /></div>
            <span className="muted small center-text">Calculado a partir dos seus lançamentos.</span>
          </>
        )}
      </main>
    </>
  )
}
