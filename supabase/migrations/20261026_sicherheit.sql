-- Sicherheits-Paket (Sicherheitscheck 26.10.2026)

-- 1) Konto löschen (DSGVO Art. 17): alle Nutzerdaten hängen per ON DELETE CASCADE an auth.users
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  delete from auth.users where id = uid;
end;
$$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- 2) Wer einen Tipp geschrieben hat, ist nicht mehr öffentlich lesbar (auch nicht als Kennung)
revoke select on public.place_tips from anon, authenticated;
grant select (id, district_id, lat, lon, place_name, category, body, author_name, created_at, hidden, report_count)
  on public.place_tips to anon, authenticated;

-- Eigene Tipps (zum Löschen) nur über diese Funktion
create or replace function public.my_tip_ids()
returns table (id uuid)
language sql
security definer
stable
set search_path = ''
as $$
  select t.id from public.place_tips t where t.user_id = auth.uid();
$$;
revoke all on function public.my_tip_ids() from public, anon;
grant execute on function public.my_tip_ids() to authenticated;

-- 3) Tipps: dieselben Regeln wie in der App auch direkt in der Datenbank (gegen Umgehung der App)
create or replace function public.prepare_tip()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.body ~* '(https?://|www\.)' then
    raise exception 'Bitte keine Links in Tipps.';
  end if;
  if (select count(*) from public.place_tips t
        where t.user_id = new.user_id and t.created_at > now() - interval '1 hour') >= 5 then
    raise exception 'Zu viele Tipps in kurzer Zeit.';
  end if;
  new.report_count := 0;
  new.hidden := false;
  new.author_name := 'Reisende:r';
  return new;
end;
$$;

alter table public.place_tips drop constraint if exists place_tips_coords_check;
alter table public.place_tips add constraint place_tips_coords_check check (lat between -90 and 90 and lon between -180 and 180);

-- 4) Unnötige Rechte entziehen (die App braucht nur lesen/schreiben/löschen, nie TRUNCATE o. Ä.)
revoke truncate, references, trigger on all tables in schema public from anon, authenticated;
-- Öffentliche Stammdaten: nur lesen
revoke insert, update, delete on public.cities, public.districts, public.district_scores, public.criteria from anon, authenticated;
