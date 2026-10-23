-- Bereits im Supabase-Projekt staycheck-v2 ausgeführt (zur Dokumentation).

create table public.cities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  country text not null,
  created_at timestamptz not null default now()
);

create table public.districts (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references public.cities(id) on delete cascade,
  slug text not null,
  name text not null,
  short_description text,
  lat double precision,
  lng double precision,
  created_at timestamptz not null default now(),
  unique (city_id, slug)
);
create index districts_city_id_idx on public.districts(city_id);

create table public.criteria (
  key text primary key,
  label text not null,
  description text,
  sort_order smallint not null default 0
);

create table public.district_scores (
  district_id uuid not null references public.districts(id) on delete cascade,
  criterion_key text not null references public.criteria(key) on delete cascade,
  score smallint not null check (score between 1 and 10),
  primary key (district_id, criterion_key)
);
create index district_scores_criterion_idx on public.district_scores(criterion_key);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

create table public.user_preferences (
  user_id uuid not null references auth.users(id) on delete cascade,
  criterion_key text not null references public.criteria(key) on delete cascade,
  weight smallint not null check (weight between 0 and 5),
  updated_at timestamptz not null default now(),
  primary key (user_id, criterion_key)
);
create index user_preferences_criterion_idx on public.user_preferences(criterion_key);

create table public.favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  district_id uuid not null references public.districts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, district_id)
);
create index favorites_district_idx on public.favorites(district_id);

alter table public.cities enable row level security;
alter table public.districts enable row level security;
alter table public.criteria enable row level security;
alter table public.district_scores enable row level security;
alter table public.profiles enable row level security;
alter table public.user_preferences enable row level security;
alter table public.favorites enable row level security;

create policy "Public read cities" on public.cities for select to anon, authenticated using (true);
create policy "Public read districts" on public.districts for select to anon, authenticated using (true);
create policy "Public read criteria" on public.criteria for select to anon, authenticated using (true);
create policy "Public read scores" on public.district_scores for select to anon, authenticated using (true);

create policy "Own profile read" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "Own profile update" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "Own prefs read" on public.user_preferences for select to authenticated using ((select auth.uid()) = user_id);
create policy "Own prefs insert" on public.user_preferences for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Own prefs update" on public.user_preferences for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Own prefs delete" on public.user_preferences for delete to authenticated using ((select auth.uid()) = user_id);

create policy "Own favorites read" on public.favorites for select to authenticated using ((select auth.uid()) = user_id);
create policy "Own favorites insert" on public.favorites for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Own favorites delete" on public.favorites for delete to authenticated using ((select auth.uid()) = user_id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
