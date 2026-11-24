import { useEffect, useState, useCallback } from 'react'
import { supabase, configOk } from './lib/supabase'
import Login from './screens/Login'
import Onboarding from './screens/Onboarding'
import Hoje from './screens/Hoje'
import Encerrar from './screens/Encerrar'
import Despesa from './screens/Despesa'
import Relatorios from './screens/Relatorios'
import Perfil from './screens/Perfil'
import Configuracoes from './screens/Configuracoes'
import Menu from './screens/Menu'
import { Privacidade, Termos } from './screens/Legal'

// O App decide qual tela mostrar:
// sem login → Login · sem meta → Onboarding · com tudo → telas do dia a dia.
export default function App() {
  const [session, setSession] = useState(undefined) // undefined = ainda carregando
  const [profile, setProfile] = useState(null)
  const [screen, setScreen] = useState('hoje')
  const [params, setParams] = useState({})
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    if (!configOk) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  const loadProfile = useCallback(async () => {
    if (!session) { setProfile(null); return }
    const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
    // Quem criou a conta por e-mail e depois entrou com o Google: o perfil não tinha nome/foto.
    // Aqui copiamos do Google (user_metadata) o que estiver faltando.
    const meta = session.user.user_metadata || {}
    const photo = meta.avatar_url || meta.picture
    const fullName = meta.full_name || meta.name
    const patch = {}
    if (data && !data.avatar_url && photo) patch.avatar_url = photo
    if (data && !data.full_name && fullName) patch.full_name = fullName
    if (Object.keys(patch).length) {
      await supabase.from('profiles').update(patch).eq('id', session.user.id)
      Object.assign(data, patch)
    }
    setProfile(data || { id: session.user.id })
  }, [session])

  useEffect(() => { loadProfile() }, [loadProfile])

  // Páginas públicas: abrem com ou sem login (o Google exige esses links).
  const path = window.location.pathname
  if (path === '/privacidade') return <Privacidade />
  if (path === '/termos') return <Termos />

  if (!configOk) {
    return <div className="center-page"><p>Faltam as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY.</p></div>
  }
  if (session === undefined || (session && !profile)) {
    return <div className="center-page"><p className="muted">Carregando…</p></div>
  }
  if (!session) return <Login />
  if (!profile.hourly_goal) return <Onboarding profile={profile} onDone={loadProfile} />

  const go = (name, p = {}) => { setParams(p); setScreen(name); setMenuOpen(false); window.scrollTo(0, 0) }
  const user = { ...profile, email: session.user.email }
  const name = profile.full_name || session.user.email.split('@')[0]
  const common = { user, name, go, openMenu: () => setMenuOpen(true) }

  return (
    <div className="app">
      {screen === 'hoje' && <Hoje {...common} />}
      {screen === 'encerrar' && <Encerrar {...common} {...params} />}
      {screen === 'despesa' && <Despesa {...common} {...params} />}
      {screen === 'relatorios' && <Relatorios {...common} {...params} />}
      {screen === 'perfil' && <Perfil {...common} />}
      {screen === 'config' && <Configuracoes {...common} onSaved={loadProfile} />}
      {menuOpen && <Menu {...common} close={() => setMenuOpen(false)} />}
    </div>
  )
}
