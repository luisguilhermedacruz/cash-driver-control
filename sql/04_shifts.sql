-- =====================================================
-- 04_shifts.sql
-- Cada turno de trabalho. Pode ter várias pausas (tabela breaks).
-- Regra: o turno pertence ao dia em que COMEÇOU (work_date).
-- =====================================================

create table public.shifts (
  id            bigint generated always as identity primary key,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  work_date     date not null,
  started_at    timestamptz not null,
  ended_at      timestamptz,
  source        text not null default 'app'
                check (source in ('historico', 'sheets', 'app')),
  time_quality  text not null default 'real'
                check (time_quality in ('real', 'ajustado')),
  notes         text,
  created_at    timestamptz not null default now(),

  -- o fim tem que ser depois do início
  check (ended_at > started_at),
  -- nenhum turno passa de 24 horas
  check (ended_at - started_at < interval '24 hours'),
  -- o mesmo motorista não pode ter dois turnos começando no mesmo instante
  unique (user_id, started_at)
);

-- Busca rápida dos turnos de um motorista por data
create index shifts_user_date_idx on public.shifts (user_id, work_date);

-- Só pode existir UM turno aberto por motorista
create unique index shifts_one_open_per_user
  on public.shifts (user_id)
  where ended_at is null;