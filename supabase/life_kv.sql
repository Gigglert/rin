-- Таблица для приложения «Жить жизнь» (/life).
-- Один раз выполнить в Supabase: SQL Editor → New query → вставить → Run.

create table if not exists public.life_kv (
  key        text primary key,
  value      jsonb,
  updated_at timestamptz not null default now()
);

alter table public.life_kv enable row level security;

-- Доступ по публичному ключу (anon), как у трекера задач в этом же проекте.
drop policy if exists "life_kv anon access" on public.life_kv;
create policy "life_kv anon access" on public.life_kv
  for all to anon using (true) with check (true);
