-- =====================================================
-- 03_expense_categories.sql
-- Tipos de despesa. Cada categoria pertence a um GRUPO fixo.
-- user_id vazio = padrão do sistema; preenchido = do motorista
-- =====================================================

create table public.expense_categories (
  id          bigint generated always as identity primary key,
  user_id     uuid references public.profiles(id) on delete cascade,
  name        text not null,
  group_code  text not null check (group_code in (
                'combustivel', 'veiculo', 'alimentacao',
                'plataforma', 'telefonia', 'impostos', 'outros'
              )),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),

  unique nulls not distinct (user_id, name)
);

-- Categorias padrão
insert into public.expense_categories (name, group_code) values
  ('Combustível',          'combustivel'),
  ('Alimentação',          'alimentacao'),
  ('Aluguel do carro',     'veiculo'),
  ('Manutenção',           'veiculo'),
  ('Lavagem',              'veiculo'),
  ('Pedágio',              'veiculo'),
  ('Estacionamento',       'veiculo'),
  ('Seguro',               'veiculo'),
  ('Deslocamento',         'veiculo'),
  ('Taxa de saque',        'plataforma'),
  ('Créditos InDriver',    'plataforma'),
  ('Plano de celular',     'telefonia'),
  ('IPVA / Licenciamento', 'impostos'),
  ('Multa',                'impostos'),
  ('Outros',               'outros');