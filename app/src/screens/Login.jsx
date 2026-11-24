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
          <span className="g-mark" aria-hidden="true">G</span> Entrar com Google
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
