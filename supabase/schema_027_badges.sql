-- Cosmetic badges: a small icon+label chip next to a username, similar to
-- name colors but boolean-gated rather than a stats.peakElo threshold. Unlike
-- name colors/borders (whose unlock state is purely a function of stats
-- already on the row, computed client-side), badge eligibility needs facts
-- that can't be derived that way (signup order, a real-world donation,
-- global rank across everyone), so each one is tracked as its own persisted
-- boolean here instead of a client-side isUnlocked(stats) check.
create table public.badge_catalog (id text primary key);

insert into public.badge_catalog (id) values ('founder'), ('supporter'), ('fast_typer');

alter table public.user_stats
  add column is_founder boolean not null default false,
  add column is_supporter boolean not null default false,
  add column is_fast_typer boolean not null default false,
  add column equipped_badge text references public.badge_catalog (id);

-- Backfill Founder for accounts that already existed before this migration
-- ran — the handle_new_user trigger below only decides it going forward, at
-- signup time, for brand-new accounts.
update public.user_stats us
set is_founder = true
from (select id from auth.users order by created_at asc limit 25) f
where us.user_id = f.id;

-- Founder: one of the first 25 accounts ever created. Decided once, at
-- signup, from how many user_stats rows already exist at that moment.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing_count integer;
begin
  select count(*) into v_existing_count from public.user_stats;
  insert into public.user_stats (user_id, username, is_founder)
  values (new.id, new.raw_user_meta_data ->> 'username', v_existing_count < 25);
  return new;
end;
$$;

-- Fast Typer: best wpm in any of the 6 categories is currently top-3
-- globally (user_stats is public-readable, see "select any stats" policy).
create or replace function public.is_fast_typer_user(p_user_id uuid) returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_stats me where me.user_id = p_user_id and (
      (me.best_wpm_time10 > 0 and me.best_wpm_time10 >= (select min(w) from (select best_wpm_time10 w from public.user_stats where best_wpm_time10 > 0 order by best_wpm_time10 desc limit 3) t)) or
      (me.best_wpm_time30 > 0 and me.best_wpm_time30 >= (select min(w) from (select best_wpm_time30 w from public.user_stats where best_wpm_time30 > 0 order by best_wpm_time30 desc limit 3) t)) or
      (me.best_wpm_time60 > 0 and me.best_wpm_time60 >= (select min(w) from (select best_wpm_time60 w from public.user_stats where best_wpm_time60 > 0 order by best_wpm_time60 desc limit 3) t)) or
      (me.best_wpm_words10 > 0 and me.best_wpm_words10 >= (select min(w) from (select best_wpm_words10 w from public.user_stats where best_wpm_words10 > 0 order by best_wpm_words10 desc limit 3) t)) or
      (me.best_wpm_words25 > 0 and me.best_wpm_words25 >= (select min(w) from (select best_wpm_words25 w from public.user_stats where best_wpm_words25 > 0 order by best_wpm_words25 desc limit 3) t)) or
      (me.best_wpm_words50 > 0 and me.best_wpm_words50 >= (select min(w) from (select best_wpm_words50 w from public.user_stats where best_wpm_words50 > 0 order by best_wpm_words50 desc limit 3) t))
    )
  );
$$;

-- Recomputed whenever a best_wpm_* column changes — for the row that just
-- changed, and for anyone else currently holding the badge, since a new
-- top score can bump someone else out of the top 3.
create or replace function public.refresh_fast_typer_badges() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.user_stats us set is_fast_typer = public.is_fast_typer_user(us.user_id)
  where us.user_id = new.user_id or us.is_fast_typer = true;
  return new;
end;
$$;

drop trigger if exists refresh_fast_typer_badges_trigger on public.user_stats;
create trigger refresh_fast_typer_badges_trigger
  after update of best_wpm_time10, best_wpm_time30, best_wpm_time60, best_wpm_words10, best_wpm_words25, best_wpm_words50
  on public.user_stats
  for each row execute function public.refresh_fast_typer_badges();

-- Seed is_fast_typer for whoever already qualifies as of this migration.
update public.user_stats set is_fast_typer = public.is_fast_typer_user(user_id);

-- Supporter has no automatic trigger — there's no payment integration in
-- this app, so it's toggled by hand in the SQL Editor after a real Ko-fi
-- donation is verified, e.g.:
--   update public.user_stats set is_supporter = true where username = 'someusername';

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
    if p_badge_id not in ('founder', 'supporter', 'fast_typer') then
      raise exception 'unknown badge';
    end if;

    select * into v_row from public.user_stats where user_id = v_user_id;
    if (p_badge_id = 'founder' and not v_row.is_founder)
      or (p_badge_id = 'supporter' and not v_row.is_supporter)
      or (p_badge_id = 'fast_typer' and not v_row.is_fast_typer) then
      raise exception 'badge not unlocked';
    end if;
  end if;

  update public.user_stats set equipped_badge = p_badge_id, updated_at = now() where user_id = v_user_id;
end;
$$;

grant execute on function public.set_equipped_badge to authenticated;
