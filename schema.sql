-- =============================================
-- FAMILY BUDGET APP — FULL SCHEMA v2
-- Paste into Supabase SQL Editor > Run
-- =============================================

-- Members
create table if not exists members (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  color text not null default '#6366f1',
  emoji text not null default '👤',
  role text not null default 'member' check (role in ('admin', 'member')),
  pin_hash text not null,
  requires_pin_change boolean default false,
  created_at timestamptz default now()
);

-- Expenses
create table if not exists expenses (
  id uuid default gen_random_uuid() primary key,
  description text not null,
  amount numeric(10,2) not null,
  paid_by uuid references members(id) on delete set null,
  category text not null default 'other',
  type text not null default 'shared' check (type in ('shared', 'personal')),
  personal_member uuid references members(id) on delete set null,
  is_private boolean default false,
  date date not null default current_date,
  notes text,
  created_at timestamptz default now()
);

-- Expense splits
create table if not exists expense_splits (
  id uuid default gen_random_uuid() primary key,
  expense_id uuid references expenses(id) on delete cascade,
  member_id uuid references members(id) on delete cascade,
  amount numeric(10,2) not null
);

-- Monthly budgets
create table if not exists monthly_budgets (
  id uuid default gen_random_uuid() primary key,
  year integer not null,
  month integer not null,
  category text,
  amount numeric(10,2) not null,
  unique(year, month, category)
);

-- Grocery list
create table if not exists grocery_items (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  quantity text,
  note text,
  added_by text,
  is_checked boolean default false,
  checked_by text,
  checked_at timestamptz,
  created_at timestamptz default now()
);

-- App settings
create table if not exists app_settings (
  key text primary key,
  value text not null
);

insert into app_settings (key, value) values ('currency', 'RSD') on conflict do nothing;

-- Disable RLS (private family app)
alter table members disable row level security;
alter table expenses disable row level security;
alter table expense_splits disable row level security;
alter table monthly_budgets disable row level security;
alter table grocery_items disable row level security;
alter table app_settings disable row level security;

-- Enable realtime
alter publication supabase_realtime add table grocery_items;
alter publication supabase_realtime add table expenses;
