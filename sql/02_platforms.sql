-- =====================================================
-- 02_platforms.sql
-- De onde vem cada ganho (Uber, 99, InDriver, particular...)
-- user_id vazio = padrão do sistema (todo mundo vê)
-- user_id preenchido = criada por aquele motorista
-- =====================================================

create table public.platforms (
  id         bigint generated always as identity primary key,
  user_id    uuid references public.profiles(id) on delete cascade,
  name       text not null,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),

  unique nulls not distinct (user_id, name)
);

-- Plataformas padrão
insert into public.platforms (name) values
  ('Uber'),
  ('99'),
  ('InDriver'),
  ('Particular'),
  ('Entrega');