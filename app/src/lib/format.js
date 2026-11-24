// Funções de formatação e de data, usadas em todas as telas.

const TZ = 'America/Sao_Paulo'

// Dia (AAAA-MM-DD) no horário de São Paulo.
// Regra de negócio: o turno pertence ao dia em que COMEÇOU, no horário local do motorista.
export function localDate(d = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d)
}

export function addDays(iso, n) {
  const d = new Date(iso + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

export const money = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)

export function hoursLabel(seconds) {
  const s = Math.max(0, Math.round(seconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return `${h}h${String(m).padStart(2, '0')}`
}

export function clock(seconds) {
  const s = Math.max(0, Math.floor(seconds))
  const h = String(Math.floor(s / 3600)).padStart(2, '0')
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0')
  const r = String(s % 60).padStart(2, '0')
  return `${h}:${m}:${r}`
}

export const timeLabel = (ts) =>
  new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' }).format(new Date(ts))

export function dayLabel(iso, opts = { weekday: 'long', day: 'numeric', month: 'long' }) {
  const t = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', ...opts }).format(new Date(iso + 'T12:00:00Z'))
  return t.charAt(0).toUpperCase() + t.slice(1)
}

// Converte "1.234,56" ou "1234.56" em número. Vazio vira null (vazio ≠ zero).
export function parseMoney(txt) {
  if (txt === null || txt === undefined) return null
  const s = String(txt).trim().replace(/[R$\s]/g, '')
  if (!s) return null
  const norm = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s
  const n = Number(norm)
  return Number.isFinite(n) ? n : NaN
}

// "40 min" ou "1h20" (para pausas)
export function pauseLabel(seconds) {
  const m = Math.round(seconds / 60)
  return m < 60 ? `${m} min` : hoursLabel(seconds)
}
