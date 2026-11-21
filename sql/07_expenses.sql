-- =====================================================
-- 07_expenses.sql
-- Despesas. Uma linha por gasto, com categoria (que tem grupo).
-- fuel_type só é usado quando a categoria é combustível.
-- =====================================================

create table public.expenses (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  work_date    date not null,
  shift_id     bigint references public.shifts(id) on delete set null,
  category_id  bigint not null references public.expense_categories(id),
  amount       numeric(10,2) not null check (amount > 0),
  description  text,
  fuel_type    text check (fuel_type in ('gasolina', 'etanol', 'gnv', 'eletrico')),
  source       text not null default 'app'
               check (source in ('historico', 'sheets', 'app')),
  created_at   timestamptz not null default now()
);

-- Busca rápida das despesas de um motorista por data
create index expenses_user_date_idx on public.expenses (user_id, work_date);
