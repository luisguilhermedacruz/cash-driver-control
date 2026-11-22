-- =====================================================
-- 08_rls.sql
-- Row Level Security: cada motorista só vê e mexe
-- nas PRÓPRIAS linhas. auth.uid() = id de quem está logado.
-- =====================================================

-- Garante que o RLS está ligado em todas as tabelas
alter table public.profiles           enable row level security;
alter table public.platforms          enable row level security;
alter table public.expense_categories enable row level security;
alter table public.shifts             enable row level security;
alter table public.breaks             enable row level security;
alter table public.earnings           enable row level security;
alter table public.expenses           enable row level security;

-- -----------------------------------------------------
-- PROFILES: ver e editar só o próprio perfil
-- (quem cria o perfil é o trigger do cadastro)
-- -----------------------------------------------------
create policy "profiles: ver o proprio"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));

create policy "profiles: editar o proprio"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- O motorista NÃO pode mudar o próprio plano (senão vira premium de graça).
-- Ele só pode editar nome, foto e meta.
revoke update on public.profiles from authenticated;
grant update (full_name, avatar_url, hourly_goal) on public.profiles to authenticated;

-- -----------------------------------------------------
-- PLATFORMS e EXPENSE_CATEGORIES
-- ver: as padrão (user_id vazio) + as próprias
-- criar/editar/apagar: só as próprias
-- -----------------------------------------------------
create policy "platforms: ver padrao e proprias"
  on public.platforms for select to authenticated
  using (user_id is null or user_id = (select auth.uid()));

create policy "platforms: gerenciar proprias"
  on public.platforms for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "categories: ver padrao e proprias"
  on public.expense_categories for select to authenticated
  using (user_id is null or user_id = (select auth.uid()));

create policy "categories: gerenciar proprias"
  on public.expense_categories for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- -----------------------------------------------------
-- SHIFTS, BREAKS, EARNINGS, EXPENSES
-- tudo (ver, criar, editar, apagar) só nas próprias linhas
-- -----------------------------------------------------
create policy "shifts: tudo nas proprias"
  on public.shifts for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "breaks: tudo nas proprias"
  on public.breaks for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "earnings: tudo nas proprias"
  on public.earnings for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "expenses: tudo nas proprias"
  on public.expenses for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
