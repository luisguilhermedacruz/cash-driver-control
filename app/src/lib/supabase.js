import { createClient } from '@supabase/supabase-js'

// As variáveis vêm do arquivo .env.local (no seu computador) ou das
// Environment Variables da Vercel (no site publicado).
// A chave PUBLISHABLE pode ficar no navegador: quem protege os dados é o RLS do banco.
// NUNCA coloque a chave SECRET aqui.
const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const configOk = Boolean(url && key)
export const supabase = configOk ? createClient(url, key) : null
