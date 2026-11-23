import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { money, parseMoney } from '../lib/format'
import { Logo, ErrorMsg } from '../ui'

// Tela 2 · Onboarding: só a meta de R$/hora (decisão de 23/11).
export default function Onboarding({ profile, onDone }) {
  const [goal, setGoal] = useState('60')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const g = parseMoney(goal)
  const valid = g && g > 0

  async function save(e) {
    e.preventDefault()
    if (!valid) { setError('Digite um valor maior que zero.'); return }
    setBusy(true)
    const { error } = await supabase.from('profiles').update({ hourly_goal: g }).eq('id', profile.id)
    setBusy(false)
    if (error) setError(error.message)
    else onDone()
  }

  return (
    <main className="page">
      <div className="row-8"><Logo size={32} /><span className="muted small">Primeiro acesso</span></div>
      <div className="stack-8">
        <h1>Responda uma pergunta</h1>
        <p className="muted">Com ela, o app avalia cada dia de trabalho comparando com o que você quer ganhar.</p>
      </div>
      <form className="stack-16 grow" onSubmit={save}>
        <label className="field">
          <span>Qual a sua meta de ganhos por hora?</span>
          <div className="money-input"><span>R$</span>
            <input inputMode="decimal" value={goal} onChange={(e) => setGoal(e.target.value)} aria-describedby="goal-hint" />
          </div>
          <span id="goal-hint" className="muted small">Você pode mudar depois em Configurações.</span>
        </label>
        {valid && (
          <div className="card stack-8">
            <span className="muted small">Com essa meta, seus dias ficam assim:</span>
            <div className="grid-2">
              <span><span className="badge badge-ruim"><span className="dot" />Ruim</span><br /><span className="muted small">abaixo de {money(g * 0.75)}/h</span></span>
              <span><span className="badge badge-regular"><span className="dot" />Regular</span><br /><span className="muted small">a partir de {money(g * 0.75)}/h</span></span>
              <span><span className="badge badge-bom"><span className="dot" />Bom</span><br /><span className="muted small">a partir de {money(g)}/h</span></span>
              <span><span className="badge badge-otimo"><span className="dot" />Ótimo</span><br /><span className="muted small">a partir de {money(g * 1.33)}/h</span></span>
            </div>
          </div>
        )}
        <ErrorMsg error={error} />
        <div className="grow" />
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Salvando…' : 'Começar'}</button>
      </form>
    </main>
  )
}
