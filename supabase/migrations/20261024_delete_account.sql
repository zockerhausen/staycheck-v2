-- Nutzer können ihr eigenes Konto löschen (DSGVO Art. 17).
-- Alle Nutzertabellen hängen per ON DELETE CASCADE an auth.users, also wird alles mitgelöscht.
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
