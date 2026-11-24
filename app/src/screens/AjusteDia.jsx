import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { loadPeriod } from '../lib/data'
import { shiftTimes } from '../lib/metrics'
import { addDays, localDate, money, dayLabel, timeLabel, timeInput, toTs, parseMoney, hoursLabel, pauseLabel } from '../lib/format'
import { Header, Icon, ErrorMsg } from '../ui'

const FUELS = [['gasolina', 'Gasolina'], ['etanol', 'Etanol'], ['gnv', 'GNV'], ['eletrico', 'Elétrico']]
const moneyTxt = (v) => (v == null ? '' : String(v).replace('.', ','))

// Traduz erros do banco para frases que o motorista entende.
function friendly(err) {
  const m = err?.message || String(err)
  if (m.includes('shifts_user_id_started_at_key') || m.includes('duplicate')) return 'Já existe uma jornada começando nesse mesmo horário.'
  if (m.includes('check')) return 'Horários inválidos: o fim precisa ser depois do início, e a jornada não pode passar de 24 horas.'
  return m
}

// Ajustes de um dia: jornadas (com pausas), ganhos e despesas. Tudo pode ser editado, apagado ou adicionado.
export default function AjusteDia({ user, name, go, openMenu, date, month, back }) {
  const [data, setData] = useState(null)
  const [platforms, setPlatforms] = useState([])
  const [cats, setCats] = useState([])
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(null) // { kind: 'shift' | 'earning' | 'expense', item | null }
  const today = localDate()

  const reload = useCallback(async () => {
    setError('')
    try {
      const [d, pl, ct] = await Promise.all([
        loadPeriod(date, date),
        supabase.from('platforms').select('*').order('id'),
        supabase.from('expense_categories').select('*').order('id'),
      ])
      if (pl.error || ct.error) throw pl.error || ct.error
      setData(d); setPlatforms(pl.data); setCats(ct.data)
    } catch (e) { setError(e.message) }
  }, [date])

  useEffect(() => { setData(null); reload() }, [reload])

  const goBack = () => (back === 'relatorios' ? go('relatorios', { tab: 'dia', date }) : go('ajustes', { month: month || date }))
  const moveDay = (n) => go('ajuste-dia', { date: addDays(date, n), month, back })
  const shifts = data ? [...data.shifts].sort((a, b) => a.started_at.localeCompare(b.started_at)) : []
  const shiftLabel = (s) => `${timeLabel(s.started_at)} – ${s.ended_at ? timeLabel(s.ended_at) : 'agora'}`
  const done = () => { setEditing(null); reload() }

  return (
    <>
      <Header title="Ajustes" onBack={goBack} onMenu={openMenu} initial={name[0]?.toUpperCase()} avatar={user.avatar_url} />
      <main className="page">
        <div className="row-between">
          <button className="icon-btn" onClick={() => moveDay(-1)} aria-label="Dia anterior"><Icon name="left" /></button>
          <span className="strong">{dayLabel(date)}</span>
          <button className="icon-btn" onClick={() => moveDay(1)} disabled={date >= today} aria-label="Próximo dia"><Icon name="right" /></button>
        </div>
        <ErrorMsg error={error} />
        {!data && !error && <p className="muted">Carregando…</p>}

        {data && (
          <>
            <Section title="Jornadas" onAdd={() => setEditing({ kind: 'shift', item: null })}>
              {shifts.length === 0 && <p className="muted small">Nenhuma jornada nesse dia.</p>}
              {shifts.map((s) => {
                const t = shiftTimes(s, data.breaks.filter((b) => b.shift_id === s.id))
                return (
                  <Row key={s.id} onClick={() => setEditing({ kind: 'shift', item: s })}
                    main={shiftLabel(s)}
                    sub={`${hoursLabel(t.worked)} trabalhadas${t.pauses ? ` · ${t.pauses} ${t.pauses === 1 ? 'pausa' : 'pausas'} (${pauseLabel(t.paused)})` : ''}${s.time_quality === 'ajustado' ? ' · ajustado' : ''}`} />
                )
              })}
            </Section>

            <Section title="Ganhos" onAdd={() => setEditing({ kind: 'earning', item: null })}>
              {data.earnings.length === 0 && <p className="muted small">Nenhum ganho nesse dia.</p>}
              {data.earnings.map((e) => (
                <Row key={e.id} onClick={() => setEditing({ kind: 'earning', item: e })}
                  main={e.platforms?.name || '—'} value={money(e.amount)}
                  sub={e.shift_id ? `jornada ${shiftLabel(shifts.find((s) => s.id === e.shift_id) || {})}` : 'sem jornada'} />
              ))}
            </Section>

            <Section title="Despesas" onAdd={() => setEditing({ kind: 'expense', item: null })}>
              {data.expenses.length === 0 && <p className="muted small">Nenhuma despesa nesse dia.</p>}
              {data.expenses.map((x) => (
                <Row key={x.id} onClick={() => setEditing({ kind: 'expense', item: x })}
                  main={x.expense_categories?.name || '—'} value={money(x.amount)} sub={x.description || ''} />
              ))}
            </Section>
          </>
        )}
      </main>

      {editing && (
        <div className="overlay overlay-sheet" onClick={() => setEditing(null)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            {editing.kind === 'shift' && <ShiftForm user={user} date={date} shift={editing.item}
              breaks={editing.item ? data.breaks.filter((b) => b.shift_id === editing.item.id) : []}
              earningsCount={editing.item ? data.earnings.filter((e) => e.shift_id === editing.item.id).length : 0}
              onClose={() => setEditing(null)} onDone={done} />}
            {editing.kind === 'earning' && <EarningForm user={user} date={date} earning={editing.item}
              platforms={platforms} shifts={shifts} shiftLabel={shiftLabel} onClose={() => setEditing(null)} onDone={done} />}
            {editing.kind === 'expense' && <ExpenseForm user={user} date={date} expense={editing.item}
              cats={cats} onClose={() => setEditing(null)} onDone={done} />}
          </div>
        </div>
      )}
    </>
  )
}

function Section({ title, onAdd, children }) {
  return (
    <section className="stack-8">
      <div className="row-between">
        <span className="strong">{title}</span>
        <button className="link-btn" onClick={onAdd}><Icon name="plus" size={18} /> Adicionar</button>
      </div>
      {children}
    </section>
  )
}

function Row({ main, sub, value, onClick }) {
  return (
    <button className="card edit-row" onClick={onClick}>
      <span className="stack-2">
        <span>{main}</span>
        {sub && <span className="muted small">{sub}</span>}
      </span>
      <span className="row-8">{value && <span className="strong num">{value}</span>}<Icon name="edit" size={18} /></span>
    </button>
  )
}

// Parte de baixo de todo formulário: Salvar, e (se já existe) Apagar com confirmação.
function FormActions({ busy, canDelete, deleteLabel, onDelete, confirmExtra, onClose }) {
  const [confirming, setConfirming] = useState(false)
  return (
    <>
      {confirming ? (
        <div className="card stack-8 confirm">
          <span className="strong">Tem certeza? Isso não pode ser desfeito.</span>
          {confirmExtra}
          <div className="row-8">
            <button type="button" className="btn btn-secondary grow" onClick={() => setConfirming(false)}>Cancelar</button>
            <button type="button" className="btn btn-danger grow" disabled={busy} onClick={onDelete}>Sim, apagar</button>
          </div>
        </div>
      ) : (
        <>
          <button className="btn btn-primary" disabled={busy}>{busy ? 'Salvando…' : 'Salvar'}</button>
          <div className="row-8">
            <button type="button" className="btn btn-secondary grow" onClick={onClose}>Cancelar</button>
            {canDelete && <button type="button" className="btn btn-danger grow" onClick={() => setConfirming(true)}><Icon name="trash" size={18} /> {deleteLabel}</button>}
          </div>
        </>
      )}
    </>
  )
}

// ---------- Jornada (com pausas) ----------
function ShiftForm({ user, date, shift, breaks, earningsCount, onClose, onDone }) {
  const isOpen = shift && !shift.ended_at
  const [start, setStart] = useState(shift ? timeInput(shift.started_at) : '')
  const [end, setEnd] = useState(shift?.ended_at ? timeInput(shift.ended_at) : '')
  const [pauses, setPauses] = useState(() => breaks
    .sort((a, b) => a.started_at.localeCompare(b.started_at))
    .map((b) => ({ start: timeInput(b.started_at), end: b.ended_at ? timeInput(b.ended_at) : '' })))
  const [withEarnings, setWithEarnings] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // Hora menor que o início = já é o dia seguinte (jornada que passa da meia-noite).
  const at = (hhmm) => toTs(hhmm < start ? addDays(date, 1) : date, hhmm)

  async function save(e) {
    e.preventDefault()
    if (!start || !end) { setError('Preencha o início e o fim da jornada.'); return }
    const s = at(start)
    const f = toTs(end <= start ? addDays(date, 1) : date, end)
    const rows = []
    for (const p of pauses) {
      if (!p.start || !p.end) { setError('Preencha início e fim de todas as pausas (ou remova a pausa).'); return }
      const ps = at(p.start)
      const pe = toTs(p.end <= p.start ? addDays(ps.slice(0, 10), 1) : ps.slice(0, 10), p.end)
      if (new Date(ps) < new Date(s) || new Date(pe) > new Date(f)) { setError(`A pausa ${p.start}–${p.end} precisa ficar dentro da jornada.`); return }
      rows.push({ started_at: ps, ended_at: pe })
    }
    setBusy(true); setError('')
    try {
      // Editou à mão = horário "ajustado" (o relatório mostra que não foi o cronômetro).
      const fields = { work_date: date, started_at: s, ended_at: f, time_quality: 'ajustado' }
      let id = shift?.id
      if (id) {
        const r = await supabase.from('shifts').update(fields).eq('id', id)
        if (r.error) throw r.error
        const d = await supabase.from('breaks').delete().eq('shift_id', id) // troca as pausas antigas pelas novas
        if (d.error) throw d.error
      } else {
        const r = await supabase.from('shifts').insert({ ...fields, user_id: user.id }).select('id').single()
        if (r.error) throw r.error
        id = r.data.id
      }
      if (rows.length) {
        const r = await supabase.from('breaks').insert(rows.map((b) => ({ ...b, shift_id: id, user_id: user.id })))
        if (r.error) throw r.error
      }
      onDone()
    } catch (err) { setError(friendly(err)); setBusy(false) }
  }

  async function remove() {
    setBusy(true); setError('')
    try {
      if (withEarnings && earningsCount) {
        const r = await supabase.from('earnings').delete().eq('shift_id', shift.id)
        if (r.error) throw r.error
      }
      const r = await supabase.from('shifts').delete().eq('id', shift.id) // as pausas vão junto (cascade)
      if (r.error) throw r.error
      onDone()
    } catch (err) { setError(friendly(err)); setBusy(false) }
  }

  if (isOpen) {
    return (
      <div className="stack-12">
        <span className="strong big">Jornada em andamento</span>
        <p className="muted small">Ela começou às {timeLabel(shift.started_at)} e ainda está aberta. Encerre na tela Hoje e depois volte aqui para ajustar os horários.</p>
        <button className="btn btn-secondary" onClick={onClose}>Entendi</button>
      </div>
    )
  }

  return (
    <form className="stack-12" onSubmit={save}>
      <span className="strong big">{shift ? 'Editar jornada' : 'Nova jornada'}</span>
      <div className="grid-2">
        <label className="field"><span>Início</span><input type="time" value={start} onChange={(e) => setStart(e.target.value)} /></label>
        <label className="field"><span>Fim</span><input type="time" value={end} onChange={(e) => setEnd(e.target.value)} /></label>
      </div>
      {start && end && end <= start && <span className="muted small">Termina no dia seguinte (passou da meia-noite).</span>}

      <span className="strong">Pausas</span>
      {pauses.length === 0 && <span className="muted small">Sem pausas.</span>}
      {pauses.map((p, i) => (
        <div key={i} className="pause-row">
          <label className="field"><span>Início</span><input type="time" value={p.start} onChange={(e) => setPauses(pauses.map((x, j) => (j === i ? { ...x, start: e.target.value } : x)))} /></label>
          <label className="field"><span>Fim</span><input type="time" value={p.end} onChange={(e) => setPauses(pauses.map((x, j) => (j === i ? { ...x, end: e.target.value } : x)))} /></label>
          <button type="button" className="icon-btn" aria-label="Remover pausa" onClick={() => setPauses(pauses.filter((_, j) => j !== i))}><Icon name="trash" size={20} /></button>
        </div>
      ))}
      <button type="button" className="link-btn left" onClick={() => setPauses([...pauses, { start: '', end: '' }])}><Icon name="plus" size={18} /> Adicionar pausa</button>

      <ErrorMsg error={error} />
      <FormActions busy={busy} canDelete={!!shift} deleteLabel="Apagar" onDelete={remove} onClose={onClose}
        confirmExtra={earningsCount > 0 && (
          <label className="check-row">
            <input type="checkbox" checked={withEarnings} onChange={(e) => setWithEarnings(e.target.checked)} />
            Apagar também {earningsCount === 1 ? 'o ganho desta jornada' : `os ${earningsCount} ganhos desta jornada`}
          </label>
        )} />
    </form>
  )
}

// ---------- Ganho ----------
function EarningForm({ user, date, earning, platforms, shifts, shiftLabel, onClose, onDone }) {
  const list = platforms.filter((p) => p.is_active || p.id === earning?.platform_id)
  const [platform, setPlatform] = useState(earning?.platform_id ?? list[0]?.id)
  const [amount, setAmount] = useState(moneyTxt(earning?.amount))
  const [shiftId, setShiftId] = useState(earning ? earning.shift_id ?? '' : shifts[0]?.id ?? '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function save(e) {
    e.preventDefault()
    const v = parseMoney(amount)
    if (!v || Number.isNaN(v) || v <= 0) { setError('Digite um valor maior que zero, ex.: 120,50'); return }
    setBusy(true); setError('')
    const fields = { platform_id: platform, amount: v, shift_id: shiftId === '' ? null : Number(shiftId), work_date: date }
    const r = earning
      ? await supabase.from('earnings').update(fields).eq('id', earning.id)
      : await supabase.from('earnings').insert({ ...fields, user_id: user.id })
    if (r.error) { setError(friendly(r.error)); setBusy(false) } else onDone()
  }

  async function remove() {
    setBusy(true)
    const r = await supabase.from('earnings').delete().eq('id', earning.id)
    if (r.error) { setError(friendly(r.error)); setBusy(false) } else onDone()
  }

  return (
    <form className="stack-12" onSubmit={save}>
      <span className="strong big">{earning ? 'Editar ganho' : 'Novo ganho'}</span>
      <div className="chips">
        {list.map((p) => (
          <button type="button" key={p.id} className={p.id === platform ? 'chip chip-on' : 'chip'} aria-pressed={p.id === platform} onClick={() => setPlatform(p.id)}>{p.name}</button>
        ))}
      </div>
      <label className="field"><span>Valor</span>
        <div className="money-input"><span>R$</span><input inputMode="decimal" placeholder="0,00" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
      </label>
      {shifts.length > 0 && (
        <label className="field"><span>De qual jornada?</span>
          <select value={shiftId} onChange={(e) => setShiftId(e.target.value)}>
            {shifts.map((s) => <option key={s.id} value={s.id}>{shiftLabel(s)}</option>)}
            <option value="">Sem jornada</option>
          </select>
        </label>
      )}
      <ErrorMsg error={error} />
      <FormActions busy={busy} canDelete={!!earning} deleteLabel="Apagar" onDelete={remove} onClose={onClose} />
    </form>
  )
}

// ---------- Despesa ----------
function ExpenseForm({ user, date, expense, cats, onClose, onDone }) {
  const list = cats.filter((c) => c.is_active || c.id === expense?.category_id)
  const [cat, setCat] = useState(expense?.category_id ?? list[0]?.id)
  const [fuel, setFuel] = useState(expense?.fuel_type || 'gasolina')
  const [amount, setAmount] = useState(moneyTxt(expense?.amount))
  const [desc, setDesc] = useState(expense?.description || '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const isFuel = list.find((c) => c.id === cat)?.group_code === 'combustivel'

  async function save(e) {
    e.preventDefault()
    const v = parseMoney(amount)
    if (!v || Number.isNaN(v) || v <= 0) { setError('Digite um valor maior que zero, ex.: 100,00'); return }
    setBusy(true); setError('')
    const fields = { category_id: cat, amount: v, description: desc.trim() || null, fuel_type: isFuel ? fuel : null, work_date: date }
    const r = expense
      ? await supabase.from('expenses').update(fields).eq('id', expense.id)
      : await supabase.from('expenses').insert({ ...fields, user_id: user.id })
    if (r.error) { setError(friendly(r.error)); setBusy(false) } else onDone()
  }

  async function remove() {
    setBusy(true)
    const r = await supabase.from('expenses').delete().eq('id', expense.id)
    if (r.error) { setError(friendly(r.error)); setBusy(false) } else onDone()
  }

  return (
    <form className="stack-12" onSubmit={save}>
      <span className="strong big">{expense ? 'Editar despesa' : 'Nova despesa'}</span>
      <div className="chips">
        {list.map((c) => (
          <button type="button" key={c.id} className={c.id === cat ? 'chip chip-on' : 'chip'} aria-pressed={c.id === cat} onClick={() => setCat(c.id)}>{c.name}</button>
        ))}
      </div>
      {isFuel && (
        <div className="segmented">
          {FUELS.map(([k, l]) => (
            <button type="button" key={k} className={fuel === k ? 'seg seg-on' : 'seg'} aria-pressed={fuel === k} onClick={() => setFuel(k)}>{l}</button>
          ))}
        </div>
      )}
      <label className="field"><span>Valor</span>
        <div className="money-input"><span>R$</span><input inputMode="decimal" placeholder="0,00" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
      </label>
      <label className="field"><span>Descrição (opcional)</span><input value={desc} onChange={(e) => setDesc(e.target.value)} /></label>
      <ErrorMsg error={error} />
      <FormActions busy={busy} canDelete={!!expense} deleteLabel="Apagar" onDelete={remove} onClose={onClose} />
    </form>
  )
}
