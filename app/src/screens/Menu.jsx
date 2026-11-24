import { supabase } from '../lib/supabase'
import { Icon } from '../ui'

// Tela 8 · Menu hambúrguer: o que se usa de vez em quando (Perfil, Relatórios, Configurações, Sair).
export default function Menu({ user, name, go, close }) {
  return (
    <div className="overlay" onClick={close}>
      <nav className="drawer" onClick={(e) => e.stopPropagation()} aria-label="Menu">
        <div className="row-end"><button className="icon-btn" onClick={close} aria-label="Fechar menu"><Icon name="close" /></button></div>
        <div className="row-12">
          {user.avatar_url ? <img src={user.avatar_url} alt="" className="avatar-mid" referrerPolicy="no-referrer" /> : <span className="avatar-mid">{name[0]?.toUpperCase()}</span>}
          <span className="stack-2"><span className="strong">{user.full_name || name}</span><span className="muted small">Meta: R$ {user.hourly_goal}/h · Plano {user.plan || 'free'}</span></span>
        </div>
        <div className="menu-list">
          <button className="menu-item" onClick={() => go('perfil')}><Icon name="user" /> Perfil</button>
          <button className="menu-item" onClick={() => go('relatorios')}><Icon name="chart" /> Relatórios</button>
          <button className="menu-item" onClick={() => go('config')}><Icon name="gear" /> Configurações</button>
        </div>
        <div className="grow" />
        <button className="menu-item danger" onClick={() => supabase.auth.signOut()}><Icon name="out" /> Sair</button>
      </nav>
    </div>
  )
}
