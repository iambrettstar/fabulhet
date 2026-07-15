-- Fabulhet cloud storage schema.
-- Run this once in the Supabase SQL editor (Dashboard → SQL Editor → New query).

create table public.novels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'Untitled Novel',
  doc jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index novels_user_id_idx on public.novels (user_id);

-- updated_at is server-authoritative; the client uses it for
-- compare-and-swap conflict detection, so it must never be client-set.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger novels_set_updated_at
  before update on public.novels
  for each row
  execute function public.set_updated_at();

alter table public.novels enable row level security;

create policy "Users can read own novels"
  on public.novels for select
  using (auth.uid() = user_id);

create policy "Users can insert own novels"
  on public.novels for insert
  with check (auth.uid() = user_id);

create policy "Users can update own novels"
  on public.novels for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own novels"
  on public.novels for delete
  using (auth.uid() = user_id);
