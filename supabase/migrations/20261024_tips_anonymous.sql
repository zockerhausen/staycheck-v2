-- Tipps erscheinen immer anonym als „Reisende:r“ (kein Name, nichts aus der E-Mail)
create or replace function public.prepare_tip()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  new.report_count := 0;
  new.hidden := false;
  new.author_name := 'Reisende:r';
  return new;
end;
$function$;

update public.place_tips set author_name = 'Reisende:r' where author_name is distinct from 'Reisende:r';
