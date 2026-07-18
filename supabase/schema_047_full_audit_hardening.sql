-- Full security audit follow-up. Findings and fixes below, ordered by
-- severity.

-- ============================================================
-- CRITICAL: duels.creator_token/opponent_token were readable by anyone
-- ============================================================
-- "select duels" was `for select to anon, authenticated using (true)` with
-- no column-level restriction possible in RLS, and public.duels is in the
-- realtime publication - so anyone could either (a) run
-- `supabase.from('duels').select('*')` with no filter to dump every guest
-- duel's tokens in one call, or (b) open an unfiltered postgres_changes
-- subscription on the table and passively harvest every token created
-- site-wide in real time, no duel id needed at all. Guest tokens are the
-- *only* authentication a non-account participant has (join_guest_duel,
-- submit_guest_duel_result, request_guest_rematch all key off a token
-- match) - a harvested token lets an attacker submit fabricated results
-- or hijack a rematch for a guest they were never part of.
--
-- Fix: move the four token columns into a separate table with RLS enabled
-- and zero policies - not in the realtime publication, unreachable by
-- anon/authenticated directly, readable only from inside security-definer
-- functions (which bypass RLS entirely). A view over duels couldn't have
-- fixed the realtime half of this (postgres_changes replicates real
-- tables, not views), so this needed to be a real table split.
create table public.duel_tokens (
  duel_id uuid primary key references public.duels (id) on delete cascade,
  creator_token uuid,
  opponent_token uuid,
  creator_rematch_token uuid,
  opponent_rematch_token uuid
);

alter table public.duel_tokens enable row level security;
-- Deliberately no policies at all - RLS enabled + no policy = denies
-- every direct client access, anon and authenticated alike. Every
-- legitimate read/write happens inside the security-definer functions
-- below, which run as the table owner and aren't subject to RLS.

insert into public.duel_tokens (duel_id, creator_token, opponent_token, creator_rematch_token, opponent_rematch_token)
select id, creator_token, opponent_token, creator_rematch_token, opponent_rematch_token
from public.duels
where creator_token is not null or opponent_token is not null
   or creator_rematch_token is not null or opponent_rematch_token is not null;

alter table public.duels
  drop column creator_token,
  drop column opponent_token,
  drop column creator_rematch_token,
  drop column opponent_rematch_token;

-- Lets the client determine "am I the creator or opponent of this duel"
-- without ever reading a token value back - it proves identity by
-- *sending* auth.uid()/its held token and getting a role name back,
-- rather than the old approach of fetching both tokens and comparing
-- client-side (which is what exposed them in the first place).
create or replace function public.get_duel_role(p_duel_id uuid, p_token uuid default null)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when auth.uid() is not null and auth.uid() = (select creator_id from public.duels where id = p_duel_id) then 'creator'
    when auth.uid() is not null and auth.uid() = (select opponent_id from public.duels where id = p_duel_id) then 'opponent'
    when p_token is not null and p_token = (select creator_token from public.duel_tokens where duel_id = p_duel_id) then 'creator'
    when p_token is not null and p_token = (select opponent_token from public.duel_tokens where duel_id = p_duel_id) then 'opponent'
    else null
  end;
$$;

grant execute on function public.get_duel_role to anon, authenticated;

-- Same idea for the one other place a token ever needs to reach the
-- client: picking up a guest's token for the *new* duel a rematch
-- created, previously read directly off the old duel's row.
create or replace function public.get_my_rematch_token(p_duel_id uuid, p_token uuid default null)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select case
    when auth.uid() is not null and auth.uid() = (select creator_id from public.duels where id = p_duel_id)
      then (select creator_rematch_token from public.duel_tokens where duel_id = p_duel_id)
    when auth.uid() is not null and auth.uid() = (select opponent_id from public.duels where id = p_duel_id)
      then (select opponent_rematch_token from public.duel_tokens where duel_id = p_duel_id)
    when p_token is not null and p_token = (select creator_token from public.duel_tokens where duel_id = p_duel_id)
      then (select creator_rematch_token from public.duel_tokens where duel_id = p_duel_id)
    when p_token is not null and p_token = (select opponent_token from public.duel_tokens where duel_id = p_duel_id)
      then (select opponent_rematch_token from public.duel_tokens where duel_id = p_duel_id)
    else null
  end;
$$;

grant execute on function public.get_my_rematch_token to anon, authenticated;

create or replace function public.create_guest_duel(p_mode text, p_value int, p_word_list text, p_creator_name text)
returns table(id uuid, creator_token uuid)
language plpgsql
security definer set search_path = public
as $$
declare
  v_id uuid := gen_random_uuid();
  v_token uuid := gen_random_uuid();
begin
  if p_creator_name is null or length(trim(p_creator_name)) = 0 then
    raise exception 'name required';
  end if;
  if p_mode not in ('words', 'time') then
    raise exception 'invalid mode';
  end if;

  insert into public.duels (id, mode, value, word_list, creator_name, status)
  values (v_id, p_mode, p_value, p_word_list, trim(p_creator_name), 'open');

  insert into public.duel_tokens (duel_id, creator_token) values (v_id, v_token);

  return query select v_id, v_token;
end;
$$;

grant execute on function public.create_guest_duel to anon, authenticated;

create or replace function public.join_guest_duel(p_duel_id uuid, p_name text)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_opponent_id uuid;
  v_opponent_name text;
  v_token uuid := gen_random_uuid();
begin
  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'name required';
  end if;

  select opponent_id, opponent_name into v_opponent_id, v_opponent_name
  from public.duels where id = p_duel_id for update;

  if not found then
    raise exception 'duel not found';
  end if;
  if v_opponent_id is not null or v_opponent_name is not null then
    raise exception 'duel already has an opponent';
  end if;

  update public.duels
  set opponent_name = trim(p_name), status = 'accepted'
  where id = p_duel_id;

  insert into public.duel_tokens (duel_id, opponent_token) values (p_duel_id, v_token)
  on conflict (duel_id) do update set opponent_token = excluded.opponent_token;

  return v_token;
end;
$$;

grant execute on function public.join_guest_duel to anon, authenticated;

create or replace function public.submit_guest_duel_result(
  p_duel_id uuid,
  p_token uuid,
  p_wpm int,
  p_accuracy int,
  p_raw_wpm int,
  p_time_elapsed numeric
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_creator_token uuid;
  v_opponent_token uuid;
begin
  if p_wpm is null or p_wpm < 0 or p_wpm > 315
    or p_raw_wpm is null or p_raw_wpm < 0 or p_raw_wpm > 315
    or p_wpm > p_raw_wpm then
    raise exception 'implausible wpm';
  end if;
  if p_accuracy is null or p_accuracy < 0 or p_accuracy > 100 then
    raise exception 'invalid accuracy';
  end if;
  if p_time_elapsed is null or p_time_elapsed <= 0 or p_time_elapsed > 200 then
    raise exception 'implausible time_elapsed';
  end if;

  select creator_token, opponent_token into v_creator_token, v_opponent_token
  from public.duel_tokens where duel_id = p_duel_id for update;

  if v_creator_token is not null and v_creator_token = p_token then
    update public.duels
    set creator_wpm = p_wpm, creator_accuracy = p_accuracy, creator_raw_wpm = p_raw_wpm, creator_time_elapsed = p_time_elapsed
    where id = p_duel_id;
  elsif v_opponent_token is not null and v_opponent_token = p_token then
    update public.duels
    set opponent_wpm = p_wpm, opponent_accuracy = p_accuracy, opponent_raw_wpm = p_raw_wpm, opponent_time_elapsed = p_time_elapsed
    where id = p_duel_id;
  else
    raise exception 'invalid token';
  end if;
end;
$$;

grant execute on function public.submit_guest_duel_result to anon, authenticated;

create or replace function public.request_rematch(p_duel_id uuid, p_word_list text)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_creator_id uuid;
  v_opponent_id uuid;
  v_creator_name text;
  v_opponent_name text;
  v_mode text;
  v_value int;
  v_creator_wpm int;
  v_opponent_wpm int;
  v_creator_rematch boolean;
  v_opponent_rematch boolean;
  v_rematch_duel_id uuid;
  v_new_id uuid;
  v_new_creator_token uuid;
  v_new_opponent_token uuid;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  select creator_id, opponent_id, creator_name, opponent_name, mode, value, creator_wpm, opponent_wpm,
         creator_rematch, opponent_rematch, rematch_duel_id
  into v_creator_id, v_opponent_id, v_creator_name, v_opponent_name, v_mode, v_value, v_creator_wpm, v_opponent_wpm,
       v_creator_rematch, v_opponent_rematch, v_rematch_duel_id
  from public.duels where id = p_duel_id for update;

  if not found then
    raise exception 'duel not found';
  end if;
  if v_creator_wpm is null or v_opponent_wpm is null then
    raise exception 'duel not finished';
  end if;

  if v_user_id = v_creator_id then
    v_creator_rematch := true;
    update public.duels set creator_rematch = true where id = p_duel_id;
  elsif v_user_id = v_opponent_id then
    v_opponent_rematch := true;
    update public.duels set opponent_rematch = true where id = p_duel_id;
  else
    raise exception 'not part of this duel';
  end if;

  if v_creator_rematch and v_opponent_rematch and v_rematch_duel_id is null then
    v_new_creator_token := case when v_creator_id is null then gen_random_uuid() else null end;
    v_new_opponent_token := case when v_opponent_id is null then gen_random_uuid() else null end;

    insert into public.duels
      (creator_id, opponent_id, creator_name, opponent_name, mode, value, word_list, status)
    values
      (v_creator_id, v_opponent_id, v_creator_name, v_opponent_name, v_mode, v_value, p_word_list, 'accepted')
    returning id into v_new_id;

    insert into public.duel_tokens (duel_id, creator_token, opponent_token)
    values (v_new_id, v_new_creator_token, v_new_opponent_token);

    update public.duels set rematch_duel_id = v_new_id where id = p_duel_id;
    insert into public.duel_tokens (duel_id, creator_rematch_token, opponent_rematch_token)
    values (p_duel_id, v_new_creator_token, v_new_opponent_token)
    on conflict (duel_id) do update
    set creator_rematch_token = excluded.creator_rematch_token,
        opponent_rematch_token = excluded.opponent_rematch_token;

    v_rematch_duel_id := v_new_id;
  end if;

  return v_rematch_duel_id;
end;
$$;

grant execute on function public.request_rematch to authenticated;

create or replace function public.request_guest_rematch(p_duel_id uuid, p_token uuid, p_word_list text)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_creator_id uuid;
  v_opponent_id uuid;
  v_creator_name text;
  v_opponent_name text;
  v_creator_token uuid;
  v_opponent_token uuid;
  v_mode text;
  v_value int;
  v_creator_wpm int;
  v_opponent_wpm int;
  v_creator_rematch boolean;
  v_opponent_rematch boolean;
  v_rematch_duel_id uuid;
  v_new_id uuid;
  v_new_creator_token uuid;
  v_new_opponent_token uuid;
begin
  select d.creator_id, d.opponent_id, d.creator_name, d.opponent_name, dt.creator_token, dt.opponent_token,
         d.mode, d.value, d.creator_wpm, d.opponent_wpm, d.creator_rematch, d.opponent_rematch, d.rematch_duel_id
  into v_creator_id, v_opponent_id, v_creator_name, v_opponent_name, v_creator_token, v_opponent_token,
       v_mode, v_value, v_creator_wpm, v_opponent_wpm, v_creator_rematch, v_opponent_rematch, v_rematch_duel_id
  from public.duels d
  left join public.duel_tokens dt on dt.duel_id = d.id
  where d.id = p_duel_id for update of d;

  if not found then
    raise exception 'duel not found';
  end if;
  if v_creator_wpm is null or v_opponent_wpm is null then
    raise exception 'duel not finished';
  end if;

  if p_token = v_creator_token then
    v_creator_rematch := true;
    update public.duels set creator_rematch = true where id = p_duel_id;
  elsif p_token = v_opponent_token then
    v_opponent_rematch := true;
    update public.duels set opponent_rematch = true where id = p_duel_id;
  else
    raise exception 'invalid token';
  end if;

  if v_creator_rematch and v_opponent_rematch and v_rematch_duel_id is null then
    v_new_creator_token := case when v_creator_id is null then gen_random_uuid() else null end;
    v_new_opponent_token := case when v_opponent_id is null then gen_random_uuid() else null end;

    insert into public.duels
      (creator_id, opponent_id, creator_name, opponent_name, mode, value, word_list, status)
    values
      (v_creator_id, v_opponent_id, v_creator_name, v_opponent_name, v_mode, v_value, p_word_list, 'accepted')
    returning id into v_new_id;

    insert into public.duel_tokens (duel_id, creator_token, opponent_token)
    values (v_new_id, v_new_creator_token, v_new_opponent_token);

    update public.duels set rematch_duel_id = v_new_id where id = p_duel_id;
    insert into public.duel_tokens (duel_id, creator_rematch_token, opponent_rematch_token)
    values (p_duel_id, v_new_creator_token, v_new_opponent_token)
    on conflict (duel_id) do update
    set creator_rematch_token = excluded.creator_rematch_token,
        opponent_rematch_token = excluded.opponent_rematch_token;

    v_rematch_duel_id := v_new_id;
  end if;

  return v_rematch_duel_id;
end;
$$;

grant execute on function public.request_guest_rematch to anon, authenticated;

-- ============================================================
-- MEDIUM: duels INSERT policy let a client immediately forge an
-- 'accepted' duel with fabricated results against a real user, or spam
-- a duel invite at anyone (not just friends)
-- ============================================================
-- "insert own duel" only checked creator_id = auth.uid() - nothing
-- constrained status, opponent_id, or the wpm/accuracy/time columns at
-- insert time. An attacker could insert a row naming a real user as
-- opponent_id with status already 'accepted' and fabricated results,
-- displaying a spoofed completed match against someone who never played
-- - or send unsolicited duel invites to any user id, not just friends.
-- Duels only ever legitimately get created at 'open' (shareable link) or
-- 'pending' (friend invite, opponent_id required to actually be a
-- friend) - every later status transition already goes through
-- accept_duel_invite/decline_duel_invite/join_duel/join_guest_duel, none
-- of which allow the client to set result columns directly at that point
-- either. value is also bounded to the same range the client's own
-- picker already clamps to, closing off inserting an absurd duration.
drop policy if exists "insert own duel" on public.duels;

create policy "insert own duel" on public.duels
  for insert to authenticated
  with check (
    creator_id = auth.uid()
    and status in ('open', 'pending')
    and value between 5 and 300
    and creator_wpm is null and opponent_wpm is null
    and creator_rematch = false and opponent_rematch = false
    and rematch_duel_id is null
    and (
      opponent_id is null
      or exists (
        select 1 from public.friendships f
        where f.status = 'accepted'
          and ((f.requester_id = auth.uid() and f.addressee_id = opponent_id)
            or (f.addressee_id = auth.uid() and f.requester_id = opponent_id))
      )
    )
  );

-- ============================================================
-- MEDIUM: RLS was never enabled on 5 cosmetic-catalog tables
-- ============================================================
-- avatar_catalog/border_catalog/accent_color_catalog/name_color_catalog/
-- badge_catalog never got `alter table ... enable row level security` at
-- all - unlike every other table in this schema. Nothing today trusts
-- their *contents* for unlock logic (every set_equipped_* function gates
-- eligibility with its own hardcoded conditions, not by reading these
-- rows), so this was latent rather than a live account-compromise path -
-- but with RLS off, Supabase's default schema privileges are the only
-- thing standing between these tables and being world-writable. Locking
-- them down: public read (they're just id lists, already effectively
-- public via what cosmetics are equippable), no client writes at all -
-- catalog entries only ever change via a migration.
alter table public.avatar_catalog enable row level security;
alter table public.border_catalog enable row level security;
alter table public.accent_color_catalog enable row level security;
alter table public.name_color_catalog enable row level security;
alter table public.badge_catalog enable row level security;

create policy "select avatar catalog" on public.avatar_catalog for select to anon, authenticated using (true);
create policy "select border catalog" on public.border_catalog for select to anon, authenticated using (true);
create policy "select accent color catalog" on public.accent_color_catalog for select to anon, authenticated using (true);
create policy "select name color catalog" on public.name_color_catalog for select to anon, authenticated using (true);
create policy "select badge catalog" on public.badge_catalog for select to anon, authenticated using (true);

-- ============================================================
-- MEDIUM: admin cosmetics-bypass usernames aren't reserved anywhere
-- ============================================================
-- set_equipped_cosmetics/set_equipped_accent_color/set_equipped_name_color
-- all unlock everything for lower(username) in ('yvern', 'lol'), but
-- nothing stops a new signup or an existing account's rename from
-- claiming either string if it isn't already taken - instant full
-- cosmetics unlock for anyone who gets there first. 'yvern' is already
-- registered (the real admin account), so it's implicitly protected by
-- the existing username-uniqueness constraint, but 'lol' had no such
-- protection. Reserving both explicitly in both places a username can be
-- chosen closes this regardless of which one happens to be free today.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing_count integer;
  v_username text;
  v_base text;
  v_suffix text;
  v_attempt integer := 0;
begin
  select count(*) into v_existing_count from public.user_stats;

  v_username := new.raw_user_meta_data ->> 'username';

  if v_username is not null and lower(v_username) in ('yvern', 'lol') then
    raise exception 'username not available';
  end if;

  if v_username is null then
    v_base := regexp_replace(
      coalesce(new.raw_user_meta_data ->> 'user_name', new.raw_user_meta_data ->> 'full_name', ''),
      '[^A-Za-z0-9]', '', 'g'
    );
    if length(v_base) < 3 then
      v_base := 'user';
    end if;
    v_base := left(v_base, 14);

    loop
      v_suffix := lpad(floor(random() * 100000)::text, 5, '0');
      v_username := left(v_base, 20 - length(v_suffix)) || v_suffix;
      v_attempt := v_attempt + 1;
      exit when v_attempt > 20 or not exists (
        select 1 from public.user_stats where lower(username) = lower(v_username)
      );
    end loop;
  end if;

  insert into public.user_stats (user_id, username, is_founder)
  values (new.id, v_username, v_existing_count < 25);
  return new;
end;
$$;

-- change_username's body is otherwise unchanged from schema.sql - only
-- the new reserved-word check is added, right alongside the existing
-- format/cooldown checks.
create or replace function public.change_username(p_new_username text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_current_username text;
  v_last_changed timestamptz;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  if p_new_username !~ '^[A-Za-z0-9]{3,20}$' then
    raise exception 'invalid username';
  end if;

  if lower(p_new_username) in ('yvern', 'lol') then
    raise exception 'username not available';
  end if;

  select username, username_changed_at into v_current_username, v_last_changed
  from public.user_stats where user_id = v_user_id for update;

  if lower(v_current_username) = lower(p_new_username) then
    raise exception 'that is already your username';
  end if;

  if v_last_changed is not null and now() - v_last_changed < interval '7 days' then
    raise exception 'username can only be changed once every 7 days';
  end if;

  update public.user_stats
  set username = p_new_username, username_changed_at = now(), updated_at = now()
  where user_id = v_user_id;

  update auth.users
  set raw_user_meta_data = raw_user_meta_data || jsonb_build_object('username', p_new_username)
  where id = v_user_id;
end;
$$;

grant execute on function public.change_username to authenticated;

-- ============================================================
-- LOW: user_stats/challenge_claims INSERT policies checked ownership
-- only, not the row's values - same bug class as the UPDATE hole fixed
-- in schema_045, currently unreachable in practice (handle_new_user's
-- own insert runs as a security-definer trigger and bypasses RLS; the
-- claim RPCs' own inserts do too) but worth closing directly rather than
-- relying on that being true forever.
-- ============================================================
drop policy if exists "insert own stats" on public.user_stats;
drop policy if exists "insert own claims" on public.daily_challenge_claims;
drop policy if exists "insert own hourly claims" on public.hourly_challenge_claims;
drop policy if exists "insert own weekly claims" on public.weekly_challenge_claims;

-- ============================================================
-- LOW: bug_reports/contact_messages let the client set an arbitrary
-- user_id, misattributing a report to someone who never sent it
-- ============================================================
drop policy if exists "insert bug reports" on public.bug_reports;
drop policy if exists "insert contact messages" on public.contact_messages;

create policy "insert bug reports" on public.bug_reports
  for insert to anon, authenticated
  with check (user_id is null or user_id = auth.uid());

create policy "insert contact messages" on public.contact_messages
  for insert to anon, authenticated
  with check (user_id is null or user_id = auth.uid());
