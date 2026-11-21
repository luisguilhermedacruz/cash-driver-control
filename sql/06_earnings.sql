-- =====================================================
-- 06_earnings.sql
-- Ganhos. Uma linha por valor recebido de uma plataforma.
-- shift_id pode ficar vazio: o histórico tem dias com valor
-- mas sem horário (sem turno para ligar).
-- =====================================================

create table public.earnings (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  work_date    date not null,
  shift_id     bigint references public.shifts(id) on delete set null,
  platform_id  bigint not null references public.platforms(id),
  amount       numeric(10,2) not null check (amount > 0),
  source       text not null default 'app'
               check (source in ('historico', 'sheets', 'app')),
  created_at   timestamptz not null default now()
);

-- Busca rápida dos ganhos de um motorista por data
create index earnings_user_date_idx on public.earnings (user_id, work_date);
