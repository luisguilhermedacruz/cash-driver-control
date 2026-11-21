-- =====================================================
-- 05_breaks.sql
-- Pausas dentro de um turno. Um turno pode ter várias.
-- =====================================================

create table public.breaks (
  id          bigint generated always as identity primary key,
  shift_id    bigint not null references public.shifts(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  started_at  timestamptz not null,
  ended_at    timestamptz,
  created_at  timestamptz not null default now(),

  check (ended_at > started_at)
);

create index breaks_shift_idx on public.breaks (shift_id);