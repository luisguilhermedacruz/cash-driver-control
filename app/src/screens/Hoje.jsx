import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { loadPeriod } from '../lib/data'
import { localDate, addDays, money, hoursLabel, clock, timeLabel, dayLabel } from '../lib/format'
import { summarize, workedSeconds } from '../lib/metrics'
import { Header, Stat, Badge, Icon, ErrorMsg } from '../ui'

// Telas 3 e 4 · Hoje. A mesma tela muda de "estado": sem turno → rodando → em pausa.
export default function Hoje({ user, name, go, openMenu }) {
  const [open, setOpen] = useState(undefined) // turno aberto (ou null)
  const [breaks, setBreaks] = useState([])
  const [shiftExpenses, setShiftExpenses] = useState([])
  const [period, setPeriod] = useState(null)
  const [, setTick] = useState(0)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [ask, setAsk] = useState(null) // turno de hoje já encerrado → perguntar se continua nele
  const [confirmDelete, setConfirmDelete] = useState(false)
  const today = localDate()
  const yesterday = addDays(today, -1)

  const load = useCallback(async () => {
    try {
      const { data: sh, error } = await supabase.from('shifts').select('*').is('ended_at', null).maybeSingle()
      if (error) throw error
      setOpen(sh)
      if (sh) {
        const [br, ex] = await Promise.all([
          supabase.from('breaks').select('*').eq('shift_id', sh.id).order('started_at'),
          supabase.from('expenses').select('*, expense_categories(name)').eq('shift_id', sh.id).order('created_at'),
        ])
        setBreaks(br.data || []); setShiftExpenses(ex.data || [])
      } else { setBreaks([]); setShiftExpenses([]) }
      setPeriod(await loadPeriod(yesterday, today))
    } catch (e) { setError(e.message) }
  }, [today, yesterday])

  useEffect(() => { load() }, [load])
  useEffect(() => { const t = setInterval(() => setTick((x) => x + 1), 1000); return () => clearInterval(t) }, [])

  async function run(fn) {
    setBusy(true); setError('')
    const { error } = await fn()
    if (error) setError(error.message)
    await load(); setBusy(false)
  }
  const now = () => new Date().toISOString()
  // Regra: um turno por dia. Se já existe um turno de HOJE encerrado, não cria outro:
  // pergunta se a pessoa quer continuar nele (o tempo parado vira uma pausa).
  const lastToday = (period?.shifts || [])
    .filter((s) => s.work_date === today && s.ended_at)
    .sort((a, b) => b.ended_at.localeCompare(a.ended_at))[0]
  function start() {
    if (lastToday) { setAsk(lastToday); return }
    run(() => supabase.from('shifts').insert({ user_id: user.id, work_date: today, started_at: now() }))
  }
  // Continuar: 1) cria a pausa do fim antigo até agora; 2) "reabre" o turno (ended_at volta a ficar vazio).
  const continueShift = () => run(async () => {
    const b = await supabase.from('breaks').insert({ shift_id: ask.id, user_id: user.id, started_at: ask.ended_at, ended_at: now() })
    if (b.error) return b
    setAsk(null)
    return supabase.from('shifts').update({ ended_at: null }).eq('id', ask.id)
  })
  // Apagar o turno aberto (ex.: começou sem querer). As pausas vão junto; ganhos do turno também.
  const deleteOpen = () => run(async () => {
    const e = await supabase.from('earnings').delete().eq('shift_id', open.id)
    if (e.error) return e
    setConfirmDelete(false)
    return supabase.from('shifts').delete().eq('id', open.id)
  })
  const openBreak = breaks.find((b) => !b.ended_at)
  const pause = () => run(() => supabase.from('breaks').insert({ shift_id: open.id, user_id: user.id, started_at: now() }))
  const resume = () => run(() => supabase.from('breaks').update({ ended_at: now() }).eq('id', openBreak.id))

  const sum = period ? summarize(period, user.hourly_goal) : null
  const t = sum?.days.find((d) => d.date === today)
  const y = sum?.days.find((d) => d.date === yesterday)
  const hour = Number(new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: 'numeric', hourCycle: 'h23' }).format(new Date()))
  const hello = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'

  return (
    <>
      <Header onMenu={openMenu} initial={name[0]?.toUpperCase()} avatar={user.avatar_url} />
      <main className="page">
        <div className="stack-2">
          <span className="muted small">{dayLabel(today)}</span>
          <h1>{hello}, {name}</h1>
        </div>
        <ErrorMsg error={error} />
        {open === undefined && <p className="muted">Carregando…</p>}

        {open === null && (
          <>
            <div className="grid-3">
              <Stat label="Receita" value={money(t?.revenue)} />
              <Stat label="Horas" value={hoursLabel(t?.seconds || 0)} />
              <Stat label="R$/hora" value={t?.perHour ? money(t.perHour) : '—'} />
            </div>
            {t?.rating && <div className="row-8"><span className="muted small">Hoje até agora:</span><Badge r={t.rating} /></div>}
            {t?.seconds > 0 && t.expenses > 0 && (
              <p className="small">Hoje a sua hora de trabalho custou <strong>{money(t.costPerHour)}</strong>.</p>
            )}
            {y && (
              <div className="card stack-8">
                <div className="row-between"><span className="strong">Ontem</span><Badge r={y.rating} /></div>
                <div className="row-16 muted small"><span>{money(y.revenue)}</span><span>{hoursLabel(y.seconds)}</span><span>{y.perHour ? money(y.perHour) + '/h' : '—'}</span></div>
              </div>
            )}
            <div className="grow" />
            {ask ? (
              <div className="card stack-12 ask">
                <span className="strong">Você já trabalhou hoje ({timeLabel(ask.started_at)} – {timeLabel(ask.ended_at)}).</span>
                <span className="muted small">Quer continuar a jornada de hoje? O tempo desde {timeLabel(ask.ended_at)} até agora vira uma pausa, e o cronômetro volta a rodar no mesmo turno.</span>
                <button className="btn btn-primary" onClick={continueShift} disabled={busy}><Icon name="play" size={20} /> Sim, continuar a jornada</button>
                <button className="btn btn-secondary" onClick={() => setAsk(null)} disabled={busy}>Cancelar</button>
              </div>
            ) : (
              <button className="btn btn-primary btn-huge" onClick={start} disabled={busy || !period}>
                <span>{lastToday ? 'Continuar jornada' : 'Iniciar turno'}</span><small>{lastToday ? 'você já trabalhou hoje' : 'o cronômetro começa na hora'}</small>
              </button>
            )}
            <button className="btn btn-secondary" onClick={() => go('despesa')}><Icon name="plus" /> Despesa fora do turno</button>
          </>
        )}

        {open && (
          <>
            <div className="card timer">
              <span className={openBreak ? 'status status-pause' : 'status'}><span className="dot" />{openBreak ? 'Em pausa' : 'Rodando'}</span>
              <span className="timer-value">{clock(openBreak ? (Date.now() - new Date(openBreak.started_at)) / 1000 : workedSeconds(open, breaks))}</span>
              <span className="muted small">
                {openBreak ? `Pausa desde ${timeLabel(openBreak.started_at)} · trabalhado ${hoursLabel(workedSeconds(open, breaks))}` : `Início ${timeLabel(open.started_at)} · ${breaks.length} ${breaks.length === 1 ? 'pausa' : 'pausas'}`}
              </span>
            </div>
            <div className="grid-2">
              {openBreak
                ? <button className="btn btn-secondary" onClick={resume} disabled={busy}><Icon name="play" size={20} /> Voltar a rodar</button>
                : <button className="btn btn-secondary" onClick={pause} disabled={busy}><Icon name="pause" size={20} /> Pausar</button>}
              <button className="btn btn-danger" onClick={() => go('encerrar', { shiftId: open.id })} disabled={busy}>Encerrar turno</button>
            </div>
            <div className="stack-8">
              <span className="strong">Despesas deste turno</span>
              {shiftExpenses.length === 0 && <span className="muted small">Nenhuma ainda.</span>}
              {shiftExpenses.map((x) => (
                <div key={x.id} className="card row-between">
                  <span className="stack-2"><span>{x.expense_categories?.name}</span><span className="muted small">{[x.fuel_type, timeLabel(x.created_at)].filter(Boolean).join(' · ')}</span></span>
                  <span className="num">{money(x.amount)}</span>
                </div>
              ))}
            </div>
            <div className="grow" />
            <button className="btn btn-primary" onClick={() => go('despesa')}><Icon name="plus" /> Despesa</button>
            {confirmDelete ? (
              <div className="card stack-8 confirm">
                <span className="strong">Apagar este turno? O tempo e as pausas somem e não dá pra desfazer.</span>
                <div className="row-8">
                  <button className="btn btn-secondary grow" onClick={() => setConfirmDelete(false)} disabled={busy}>Cancelar</button>
                  <button className="btn btn-danger grow" onClick={deleteOpen} disabled={busy}>Sim, apagar</button>
                </div>
              </div>
            ) : (
              <button className="link-btn danger-link" onClick={() => setConfirmDelete(true)}><Icon name="trash" size={18} /> Iniciou sem querer? Apagar este turno</button>
            )}
          </>
        )}
      </main>
    </>
  )
}
