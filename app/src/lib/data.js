import { supabase } from './supabase'

// Busca tudo de um período (por work_date). O RLS garante que só voltam as linhas do motorista logado.
export async function loadPeriod(from, to) {
  const [sh, ea, ex] = await Promise.all([
    supabase.from('shifts').select('*').gte('work_date', from).lte('work_date', to),
    supabase.from('earnings').select('*, platforms(name)').gte('work_date', from).lte('work_date', to),
    supabase.from('expenses').select('*, expense_categories(name, group_code)').gte('work_date', from).lte('work_date', to),
  ])
  const err = sh.error || ea.error || ex.error
  if (err) throw err
  const ids = sh.data.map((s) => s.id)
  let breaks = []
  if (ids.length) {
    const br = await supabase.from('breaks').select('*').in('shift_id', ids)
    if (br.error) throw br.error
    breaks = br.data
  }
  return { shifts: sh.data, breaks, earnings: ea.data, expenses: ex.data }
}
