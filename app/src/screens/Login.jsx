import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { ErrorMsg } from '../ui'

// Tela 1 · Login: Google (OAuth) ou e-mail e senha.
export default function Login() {
  const [mode, setMode] = useState('entrar') // 'entrar' ou 'criar'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  // Login com Google: o Supabase manda a pessoa pro Google e, depois do login,
  // ela volta pro nosso site (redirectTo). O nome e a foto vêm do Google.
  async function google() {
    setError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) setError(error.message)
  }

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
        <img src="/quantofez-512.png" width="160" height="160" alt="QuantoFez" />
      </div>
      <div className="stack-8 center-text">
        <h1>Seja bem-vindo</h1>
        <p className="muted">Seus ganhos por hora em Uber, 99 e InDriver, num lugar só.</p>
      </div>
      <div className="stack-12">
        <button type="button" className="btn btn-google" onClick={google}>
          {/* "G" oficial do Google, nas 4 cores (as diretrizes do Google pedem o logo original no botão) */}
          <svg className="g-logo" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Continuar com o Google
        </button>
        <div className="divider"><span>ou com e-mail</span></div>
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
        <button type="button" className="link-btn" onClick={() => { setMode(mode === 'entrar' ? 'criar' : 'entrar'); setError(''); setInfo('') }}>
          {mode === 'entrar' ? 'Não tem conta? Criar conta' : 'Já tem conta? Entrar'}
        </button>
      </form>
      <p className="muted small center-text">Ao entrar, você concorda com os <a href="/termos">Termos de Uso</a> e a <a href="/privacidade">Política de Privacidade</a>.</p>
    </main>
  )
}
