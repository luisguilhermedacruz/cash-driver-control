-- =====================================================
-- 01_profiles.sql
-- Perfil de cada motorista (1 linha por pessoa cadastrada)
-- =====================================================

create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  avatar_url  text,
  hourly_goal numeric(10,2) check (hourly_goal > 0),
  plan        text not null default 'free'
              check (plan in ('free', 'standard', 'premium')),
  created_at  timestamptz not null default now()
);


-- =====================================================
-- Cria o perfil automaticamente quando alguém se cadastra
-- =====================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();