-- Reise-Profil erweitert: mit wem man reist, was in Laufweite sein soll, ein echtes Muss
alter table public.profiles
  add column if not exists travel_with text check (travel_with in ('allein', 'paar', 'freunde', 'business')),
  add column if not exists extras text[] not null default '{}'
    check (extras <@ array['supermarkt', 'waschsalon', 'cafe', 'strand', 'fitness', 'sehenswert']::text[] and cardinality(extras) <= 6),
  add column if not exists must_have text check (must_have in ('supermarkt', 'waschsalon', 'cafe', 'strand', 'fitness', 'sehenswert'));
