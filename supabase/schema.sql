-- Cloud saves for Pokegames accounts. Run once in the Supabase SQL editor.
create table if not exists public.saves (
  user_id uuid primary key references auth.users (id) on delete cascade,
  trainer_name text,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.saves enable row level security;

drop policy if exists "read own save" on public.saves;
create policy "read own save" on public.saves
  for select using (auth.uid() = user_id);

drop policy if exists "insert own save" on public.saves;
create policy "insert own save" on public.saves
  for insert with check (auth.uid() = user_id);

drop policy if exists "update own save" on public.saves;
create policy "update own save" on public.saves
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, update on public.saves to authenticated;
