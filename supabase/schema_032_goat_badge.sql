-- Secret GOAT badge. Unlike Dev (schema_031, a single hardcoded username),
-- this needs to match accounts that aren't a single reserved username, so
-- it gets a real is_goat column instead of a username check in
-- set_equipped_badge. No automatic grant (and no emails hardcoded into a
-- public repo's history) — same as Supporter, toggled by hand in the SQL
-- Editor per account, e.g.:
--   update public.user_stats set is_goat = true where username = 'someusername';
insert into public.badge_catalog (id) values ('goat');

alter table public.user_stats
  add column is_goat boolean not null default false;

create or replace function public.set_equipped_badge(p_badge_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_row public.user_stats;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  if p_badge_id is not null then
    if p_badge_id not in ('founder', 'supporter', 'fast_typer', 'dev', 'goat') then
      raise exception 'unknown badge';
    end if;

    select * into v_row from public.user_stats where user_id = v_user_id;
    if (p_badge_id = 'founder' and not v_row.is_founder)
      or (p_badge_id = 'supporter' and not v_row.is_supporter)
      or (p_badge_id = 'fast_typer' and not v_row.is_fast_typer)
      or (p_badge_id = 'dev' and lower(v_row.username) <> 'yvern')
      or (p_badge_id = 'goat' and not v_row.is_goat) then
      raise exception 'badge not unlocked';
    end if;
  end if;

  update public.user_stats set equipped_badge = p_badge_id, updated_at = now() where user_id = v_user_id;
end;
$$;

grant execute on function public.set_equipped_badge to authenticated;
