import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Logo, ErrorMsg } from '../ui'

// Tela 1 · Login. Hoje: e-mail e senha. O login com Google entra numa próxima versão.
export default function Login() {
  const [mode, setMode] = useState('entrar') // 'entrar' ou 'criar'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError(''); setInfo(''); setBusy(true)
    if (mode === 'entrar') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : error.message)
    } else {
      const { data, error } = await supabase.auth.signUp({
        email, password, options: { emailRedirectTo: window.location.origin },
      })
      if (error) setError(error.message)
      else if (!data.session) setInfo('Conta criada! Confirme pelo link que enviamos para o seu e-mail e depois entre.')
    }
    setBusy(false)
  }

  return (
    <main className="page login">
      <div className="login-brand">
        <Logo size={84} />
        <span className="brand-name">CASH DRIVER CONTROL</span>
      </div>
      <div className="stack-8 center-text">
        <h1>Seja bem-vindo</h1>
        <p className="muted">Seus ganhos por hora em Uber, 99 e InDriver, num lugar só.</p>
      </div>
      <form className="stack-12" onSubmit={submit}>
        <label className="field">
          <span>E-mail</span>
          <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="field">
          <span>Senha</span>
          <input type="password" required minLength={6} autoComplete={mode === 'entrar' ? 'current-password' : 'new-password'}
            value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <ErrorMsg error={error} />
        {info && <p className="info" role="status">{info}</p>}
        <button className="btn btn-primary" disabled={busy}>
          {busy ? 'Aguarde…' : mode === 'entrar' ? 'Entrar com e-mail' : 'Criar conta'}
        </button>
        <button type="button" className="btn btn-secondary" disabled title="Em breve">Entrar com Google (em breve)</button>
        <button type="button" className="link-btn" onClick={() => { setMode(mode === 'entrar' ? 'criar' : 'entrar'); setError(''); setInfo('') }}>
          {mode === 'entrar' ? 'Não tem conta? Criar conta' : 'Já tem conta? Entrar'}
        </button>
      </form>
      <p className="muted small center-text">Ao entrar, você concorda com os Termos de Uso e a Política de Privacidade.</p>
    </main>
  )
}
