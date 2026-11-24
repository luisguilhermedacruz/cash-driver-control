// Peças visuais reutilizadas em várias telas.

const paths = {
  menu: 'M4 7h16M4 12h16M4 17h16',
  back: 'M15 5l-7 7 7 7',
  plus: 'M12 5v14M5 12h14',
  close: 'M6 6l12 12M18 6L6 18',
  pause: 'M9 5v14M15 5v14',
  play: 'M7 5l12 7-12 7z',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 20c1.5-4 4.5-6 8-6s6.5 2 8 6',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  gear: 'M4 7h10M18 7h2M4 17h4M12 17h8M16 5v4M10 15v4',
  out: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10',
  left: 'M15 5l-7 7 7 7',
  right: 'M9 5l7 7-7 7',
  share: 'M12 3v12M7 8l5-5 5 5M5 14v5h14v-5',
  edit: 'M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
}

export function Icon({ name, size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  )
}

export function Logo({ size = 28 }) {
  // Símbolo do QuantoFez (velocímetro + cifrão). A versão com o nome fica em /quantofez-512.png
  return <img src="/quantofez-symbol-64.png" width={size} height={size} alt="" className="logo-img" />
}

export function Header({ title, onBack, onMenu, initial, avatar }) {
  return (
    <header className="header">
      {onBack
        ? <button className="icon-btn" onClick={onBack} aria-label="Voltar"><Icon name="back" /></button>
        : <button className="icon-btn" onClick={onMenu} aria-label="Abrir menu"><Icon name="menu" /></button>}
      {title
        ? <span className="header-title">{title}</span>
        : <span className="brand"><Logo size={28} /> Quanto<span className="brand-accent">Fez</span></span>}
      <button className="avatar" onClick={onMenu} aria-label="Abrir menu">
        {avatar ? <img src={avatar} alt="" referrerPolicy="no-referrer" /> : initial}
      </button>
    </header>
  )
}

export function Badge({ r }) {
  if (!r) return null
  return <span className={`badge badge-${r.key}`}><span className="dot" />{r.label}</span>
}

export function Stat({ label, value, sub }) {
  return (
    <div className="card stat">
      <span className="muted small">{label}</span>
      <span className="stat-value">{value}</span>
      {sub && <span className="muted small">{sub}</span>}
    </div>
  )
}

export function ErrorMsg({ error }) {
  if (!error) return null
  return <p className="error" role="alert">{error}</p>
}
