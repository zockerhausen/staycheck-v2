-- Gemerkte Orte (Hotels, Adressen) pro Nutzer
create table public.saved_places (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  subtitle text,
  lat double precision not null,
  lon double precision not null,
  kind text not null default 'other',
  match smallint,
  created_at timestamptz not null default now(),
  unique (user_id, lat, lon)
);
create index saved_places_user_idx on public.saved_places(user_id);

alter table public.saved_places enable row level security;

create policy "Own places read" on public.saved_places for select to authenticated using ((select auth.uid()) = user_id);
create policy "Own places insert" on public.saved_places for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Own places delete" on public.saved_places for delete to authenticated using ((select auth.uid()) = user_id);
