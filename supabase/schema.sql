-- TypeLadder account system: run this once in the Supabase SQL Editor
-- (Project → SQL Editor → New query → paste → Run).

-- One row per user, holding aggregate stats. Individual test results live
-- in test_history; these are the running totals used for level/profile display.
-- The row (including username) is created at signup by the
-- handle_new_user trigger below, not lazily on first test.
create table public.user_stats (
  user_id uuid primary key references auth.users (id) on delete cascade,
  username text not null check (username ~ '^[A-Za-z0-9]{3,20}$'),
  -- Starts null (the signup-time username isn't a "change") — set only by
  -- change_username below, which uses it to enforce a 7-day cooldown.
  username_changed_at timestamptz,
  total_tests integer not null default 0,
  total_xp integer not null default 0,
  total_time_typed double precision not null default 0,
  total_accuracy_sum double precision not null default 0,
  total_wpm_sum double precision not null default 0,
  best_wpm_time10 integer not null default 0,
  best_wpm_time30 integer not null default 0,
  best_wpm_time60 integer not null default 0,
  best_wpm_words10 integer not null default 0,
  best_wpm_words25 integer not null default 0,
  best_wpm_words50 integer not null default 0,
  elo integer not null default 1000,
  peak_elo integer not null default 1000,
  ranked_games_played integer not null default 0,
  ranked_wins integer not null default 0,
  ranked_losses integer not null default 0,
  ranked_draws integer not null default 0,
  updated_at timestamptz not null default now()
);

-- Case-insensitive uniqueness (so "John" and "john" can't both be taken).
create unique index user_stats_username_lower_idx on public.user_stats (lower(username));

-- Append-only log of every completed test.
create table public.test_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  mode text not null check (mode in ('time', 'words')),
  value integer not null,
  wpm integer not null,
  accuracy integer not null,
  raw_wpm integer not null,
  correct_chars integer not null,
  incorrect_chars integer not null,
  time_elapsed double precision not null,
  xp_earned integer not null,
  created_at timestamptz not null default now()
);

create index test_history_user_id_created_at_idx
  on public.test_history (user_id, created_at desc);

-- One row per user per day once their daily challenge is claimed — the
-- unique constraint is what prevents double-claiming (and double XP).
create table public.daily_challenge_claims (
  user_id uuid not null references auth.users (id) on delete cascade,
  challenge_date date not null,
  mode text not null,
  value integer not null,
  tests_target integer not null,
  xp_bonus integer not null,
  claimed_at timestamptz not null default now(),
  primary key (user_id, challenge_date)
);

alter table public.user_stats enable row level security;
alter table public.test_history enable row level security;
alter table public.daily_challenge_claims enable row level security;

create policy "select own stats" on public.user_stats
  for select using (auth.uid() = user_id);
create policy "insert own stats" on public.user_stats
  for insert with check (auth.uid() = user_id);
create policy "update own stats" on public.user_stats
  for update using (auth.uid() = user_id);

create policy "select own history" on public.test_history
  for select using (auth.uid() = user_id);
create policy "insert own history" on public.test_history
  for insert with check (auth.uid() = user_id);

create policy "select own claims" on public.daily_challenge_claims
  for select using (auth.uid() = user_id);
create policy "insert own claims" on public.daily_challenge_claims
  for insert with check (auth.uid() = user_id);

-- Records a finished test: appends to history and atomically updates the
-- running totals + per-mode best WPM. Called from the client via
-- supabase.rpc('record_test_result', {...}) instead of doing a
-- read-modify-write from JS, so concurrent submissions can't race.
-- best_wpm_* updates require >=40% accuracy (see schema_033) so a mashed-
-- keys/low-effort run can't buy a leaderboard spot on raw speed alone —
-- everything else about the run (history, xp, totals) still records.
create or replace function public.record_test_result(
  p_mode text,
  p_value integer,
  p_wpm integer,
  p_accuracy integer,
  p_raw_wpm integer,
  p_correct_chars integer,
  p_incorrect_chars integer,
  p_time_elapsed double precision,
  p_xp_earned integer
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  insert into public.test_history (
    user_id, mode, value, wpm, accuracy, raw_wpm,
    correct_chars, incorrect_chars, time_elapsed, xp_earned
  ) values (
    v_user_id, p_mode, p_value, p_wpm, p_accuracy, p_raw_wpm,
    p_correct_chars, p_incorrect_chars, p_time_elapsed, p_xp_earned
  );

  -- No upsert needed here: the user_stats row (with its required username)
  -- is always created at signup by the handle_new_user trigger below.
  update public.user_stats set
    total_tests = total_tests + 1,
    total_xp = total_xp + p_xp_earned,
    total_time_typed = total_time_typed + p_time_elapsed,
    total_accuracy_sum = total_accuracy_sum + p_accuracy,
    total_wpm_sum = total_wpm_sum + p_wpm,
    best_wpm_time10 = case when p_mode = 'time' and p_value = 10 and p_accuracy >= 40
      then greatest(best_wpm_time10, p_wpm) else best_wpm_time10 end,
    best_wpm_time30 = case when p_mode = 'time' and p_value = 30 and p_accuracy >= 40
      then greatest(best_wpm_time30, p_wpm) else best_wpm_time30 end,
    best_wpm_time60 = case when p_mode = 'time' and p_value = 60 and p_accuracy >= 40
      then greatest(best_wpm_time60, p_wpm) else best_wpm_time60 end,
    best_wpm_words10 = case when p_mode = 'words' and p_value = 10 and p_accuracy >= 40
      then greatest(best_wpm_words10, p_wpm) else best_wpm_words10 end,
    best_wpm_words25 = case when p_mode = 'words' and p_value = 25 and p_accuracy >= 40
      then greatest(best_wpm_words25, p_wpm) else best_wpm_words25 end,
    best_wpm_words50 = case when p_mode = 'words' and p_value = 50 and p_accuracy >= 40
      then greatest(best_wpm_words50, p_wpm) else best_wpm_words50 end,
    updated_at = now()
  where user_id = v_user_id;
end;
$$;

grant execute on function public.record_test_result to authenticated;

-- Creates the user_stats row (with username) the moment an account is
-- created, using the username captured at signup time
-- (supabase.auth.signUp({ options: { data: { username } } })). If it's
-- missing, malformed, or already taken, this raises and the whole signup
-- transaction — including the auth.users row itself — rolls back.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing_count integer;
begin
  -- Founder badge: one of the first 25 accounts ever created (see
  -- badge_catalog / is_founder further down) — decided once, here, from
  -- how many user_stats rows already exist at signup time.
  select count(*) into v_existing_count from public.user_stats;
  insert into public.user_stats (user_id, username, is_founder)
  values (new.id, new.raw_user_meta_data ->> 'username', v_existing_count < 25);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Lets the signup form check availability before submitting, so a taken
-- username shows a clear inline error instead of a failed signup.
create or replace function public.is_username_available(p_username text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
    select 1 from public.user_stats where lower(username) = lower(p_username)
  );
$$;

grant execute on function public.is_username_available to anon, authenticated;

-- Claims today's daily challenge and awards its XP bonus exactly once.
-- Returns true if this call was the one that claimed it, false if it was
-- already claimed today (so the client knows not to show the bonus twice).
create or replace function public.claim_daily_challenge(
  p_mode text,
  p_value integer,
  p_tests_target integer,
  p_xp_bonus integer
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  insert into public.daily_challenge_claims (user_id, challenge_date, mode, value, tests_target, xp_bonus)
  values (v_user_id, current_date, p_mode, p_value, p_tests_target, p_xp_bonus)
  on conflict (user_id, challenge_date) do nothing;

  if not found then
    return false;
  end if;

  update public.user_stats set total_xp = total_xp + p_xp_bonus, updated_at = now()
  where user_id = v_user_id;

  return true;
end;
$$;

grant execute on function public.claim_daily_challenge to authenticated;

-- Weekly challenge ("complete N tests this week").
create table public.weekly_challenge_claims (
  user_id uuid not null references auth.users (id) on delete cascade,
  week_start date not null,
  tests_target integer not null,
  xp_bonus integer not null,
  claimed_at timestamptz not null default now(),
  primary key (user_id, week_start)
);

alter table public.weekly_challenge_claims enable row level security;

create policy "select own weekly claims" on public.weekly_challenge_claims
  for select using (auth.uid() = user_id);
create policy "insert own weekly claims" on public.weekly_challenge_claims
  for insert with check (auth.uid() = user_id);

-- Claims this week's challenge and awards its XP bonus exactly once,
-- mirroring claim_daily_challenge but keyed by the Monday-start week.
create or replace function public.claim_weekly_challenge(
  p_week_start date,
  p_tests_target integer,
  p_xp_bonus integer
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  insert into public.weekly_challenge_claims (user_id, week_start, tests_target, xp_bonus)
  values (v_user_id, p_week_start, p_tests_target, p_xp_bonus)
  on conflict (user_id, week_start) do nothing;

  if not found then
    return false;
  end if;

  update public.user_stats set total_xp = total_xp + p_xp_bonus, updated_at = now()
  where user_id = v_user_id;

  return true;
end;
$$;

grant execute on function public.claim_weekly_challenge to authenticated;

-- Cosmetics: earnable avatars + borders (no gameplay effect, purely
-- cosmetic — profile flex only). Unlock conditions live entirely in the
-- client (src/utils/cosmetics.tsx) as pure functions of already-synced
-- stats, so there's nothing to track server-side except which cosmetic is
-- currently equipped. These catalog tables just constrain equipped_* to a
-- known, valid id via foreign key — they don't duplicate the unlock logic.
create table public.avatar_catalog (id text primary key);
create table public.border_catalog (id text primary key);

insert into public.avatar_catalog (id) values
  ('keyboard'), ('feather'), ('bolt'), ('target'), ('flame'), ('trophy'),
  ('compass'), ('star'), ('shield'), ('crown'), ('rocket'), ('mountain'),
  ('hourglass'), ('medal'), ('diamond'), ('anchor');

insert into public.border_catalog (id) values
  ('none'), ('bronze'), ('silver'), ('gold'), ('platinum'), ('diamond'), ('amethyst'), ('legend');

alter table public.user_stats
  add column equipped_avatar text not null default 'keyboard' references public.avatar_catalog (id),
  add column equipped_border text not null default 'none' references public.border_catalog (id);

-- Sets which avatar/border the caller has equipped. The foreign keys above
-- reject an unknown id; actual unlock-eligibility is checked client-side
-- since these are cosmetic-only (no ranking/competitive impact either way).
create or replace function public.set_equipped_cosmetics(p_avatar_id text, p_border_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  update public.user_stats
  set equipped_avatar = p_avatar_id, equipped_border = p_border_id, updated_at = now()
  where user_id = v_user_id;
end;
$$;

grant execute on function public.set_equipped_cosmetics to authenticated;

-- Friends: send/accept/decline requests and unfriend. One row per pair,
-- keyed by (requester, addressee) so a request has a natural direction.
-- Accepting flips status in place rather than inserting a second row, which
-- keeps "are we friends" a single-row lookup in either direction.
create table public.friendships (
  requester_id uuid not null references auth.users (id) on delete cascade,
  addressee_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  primary key (requester_id, addressee_id),
  constraint friendships_no_self check (requester_id <> addressee_id)
);

create index friendships_addressee_id_idx on public.friendships (addressee_id);

alter table public.friendships enable row level security;

create policy "select own friendships" on public.friendships
  for select using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- Lets FriendsContext subscribe to postgres_changes on this table, so a
-- request being accepted/declined by the *other* side updates your friends
-- list live instead of requiring a manual page refresh.
alter publication supabase_realtime add table public.friendships;

-- Profiles need to be viewable by username search and by friends before a
-- request is even sent, so stats (no PII beyond a username — no email,
-- nothing account-sensitive) become readable by any signed-in user. This
-- policy is additive: the original "select own stats" policy still applies,
-- select policies are OR'd together.
create policy "select any stats" on public.user_stats
  for select to authenticated using (true);

-- The global leaderboard is open to signed-out visitors too (see
-- schema_011_public_leaderboard.sql) — same non-sensitive data, just also
-- granted to the anon role.
create policy "select any stats anon" on public.user_stats
  for select to anon using (true);

-- Looks the target up by username and either creates a pending request or,
-- if they'd already requested the caller, accepts it instead of leaving two
-- one-directional rows around. Returns 'pending' or 'accepted'.
create or replace function public.send_friend_request(p_username text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_target_id uuid;
  v_existing record;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  select user_id into v_target_id from public.user_stats where lower(username) = lower(p_username);
  if v_target_id is null then
    raise exception 'user not found';
  end if;
  if v_target_id = v_user_id then
    raise exception 'cannot friend yourself';
  end if;

  select * into v_existing from public.friendships
    where (requester_id = v_user_id and addressee_id = v_target_id)
       or (requester_id = v_target_id and addressee_id = v_user_id);

  if v_existing.status = 'accepted' then
    raise exception 'already friends';
  end if;

  if v_existing.requester_id = v_user_id then
    raise exception 'request already sent';
  end if;

  if v_existing.requester_id = v_target_id then
    update public.friendships set status = 'accepted', responded_at = now()
      where requester_id = v_target_id and addressee_id = v_user_id;
    return 'accepted';
  end if;

  insert into public.friendships (requester_id, addressee_id) values (v_user_id, v_target_id);
  return 'pending';
end;
$$;

grant execute on function public.send_friend_request to authenticated;

-- Accepts or declines a pending request addressed to the caller. Declining
-- just deletes the row, same as never having sent it.
create or replace function public.respond_friend_request(p_requester_id uuid, p_accept boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  if p_accept then
    update public.friendships set status = 'accepted', responded_at = now()
      where requester_id = p_requester_id and addressee_id = v_user_id and status = 'pending';
    if not found then
      raise exception 'no pending request from that user';
    end if;
  else
    delete from public.friendships
      where requester_id = p_requester_id and addressee_id = v_user_id and status = 'pending';
  end if;
end;
$$;

grant execute on function public.respond_friend_request to authenticated;

-- Removes a friendship in either direction and either state — covers
-- unfriending an accepted friend and cancelling a request the caller sent.
create or replace function public.remove_friend(p_other_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  delete from public.friendships
    where (requester_id = v_user_id and addressee_id = p_other_user_id)
       or (requester_id = p_other_user_id and addressee_id = v_user_id);
end;
$$;

grant execute on function public.remove_friend to authenticated;

-- Lets sign-in accept a username as well as an email: Supabase's
-- password-grant API only accepts an email (or phone), so the client
-- resolves a typed username to its email via this function first. Granted
-- to anon since sign-in happens before the caller has a session.
create or replace function public.get_email_for_username(p_username text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select au.email
  from public.user_stats us
  join auth.users au on au.id = us.user_id
  where lower(us.username) = lower(p_username)
  limit 1;
$$;

grant execute on function public.get_email_for_username to anon, authenticated;

-- Accent color customization: like avatars/borders, unlock conditions live
-- entirely in the client (src/utils/accentColors.ts) as pure functions of
-- already-synced stats — here, total time typed.
create table public.accent_color_catalog (id text primary key);

insert into public.accent_color_catalog (id) values
  ('blue'), ('teal'), ('green'), ('purple'), ('orange'), ('magenta'), ('gold'), ('custom'), ('monochrome');
-- "teal" is kept for parity with existing installs (see
-- schema_009_monochrome_accent.sql) even though the client no longer offers
-- it as a choice, having renamed that slot to "monochrome".

alter table public.user_stats
  add column equipped_accent_color text not null default 'blue' references public.accent_color_catalog (id),
  add column custom_accent_hex text check (custom_accent_hex is null or custom_accent_hex ~ '^#[0-9a-fA-F]{6}$');

-- Sets the caller's equipped accent color. p_custom_hex is only stored (and
-- required) when p_color_id = 'custom' — the foreign key above rejects an
-- unknown color id, same pattern as set_equipped_cosmetics. Actual unlock
-- eligibility (time typed) is checked client-side, same rationale as the
-- avatar/border catalogs: cosmetic-only, no ranking impact either way.
create or replace function public.set_equipped_accent_color(p_color_id text, p_custom_hex text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  if p_color_id = 'custom' and (p_custom_hex is null or p_custom_hex !~ '^#[0-9a-fA-F]{6}$') then
    raise exception 'invalid custom color';
  end if;

  update public.user_stats
  set equipped_accent_color = p_color_id,
      custom_accent_hex = case when p_color_id = 'custom' then p_custom_hex else custom_accent_hex end,
      updated_at = now()
  where user_id = v_user_id;
end;
$$;

grant execute on function public.set_equipped_accent_color to authenticated;

-- Bug reports table for the /report-bug page (see schema_012_bug_reports.sql).
-- Insert-only from the client — no select policy is granted to anon or
-- authenticated, so submissions are only readable via the Supabase
-- dashboard (service role, bypasses RLS).
create table public.bug_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  description text not null,
  contact_email text,
  page_url text,
  user_agent text,
  created_at timestamptz not null default now()
);

alter table public.bug_reports enable row level security;

create policy "insert bug reports" on public.bug_reports
  for insert to anon, authenticated with check (true);

-- 1v1 duels (see schema_013_duels.sql, schema_014_duel_invites.sql,
-- schema_015_duel_guests.sql): a shared word list, a link to share, async
-- results, friend-targeted invites with an explicit accept/decline step,
-- and guest (no-account) duels identified by a per-browser token instead
-- of auth.uid(). status: 'open' (link share, no opponent yet), 'pending'
-- (friend invited, awaiting response), 'accepted' (ready to play / in
-- progress), 'declined'. No live opponent progress yet, and no per-friend
-- win/loss tally yet.
create table public.duels (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references auth.users (id) on delete cascade,
  opponent_id uuid references auth.users (id) on delete cascade,
  creator_name text,
  opponent_name text,
  creator_token uuid,
  opponent_token uuid,
  value int not null,
  mode text not null default 'words' check (mode in ('words', 'time')),
  word_list text not null,
  status text not null default 'open' check (status in ('open', 'pending', 'accepted', 'declined', 'cancelled')),
  creator_wpm int,
  creator_accuracy int,
  creator_raw_wpm int,
  creator_time_elapsed numeric,
  opponent_wpm int,
  opponent_accuracy int,
  opponent_raw_wpm int,
  opponent_time_elapsed numeric,
  creator_rematch boolean not null default false,
  opponent_rematch boolean not null default false,
  rematch_duel_id uuid references public.duels (id),
  creator_rematch_token uuid,
  opponent_rematch_token uuid,
  created_at timestamptz not null default now()
);

alter table public.duels enable row level security;

create policy "insert own duel" on public.duels
  for insert to authenticated with check (creator_id = auth.uid());

create policy "select duels" on public.duels
  for select to anon, authenticated using (true);

alter publication supabase_realtime add table public.duels;

create or replace function public.join_duel(p_duel_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_creator_id uuid;
  v_opponent_id uuid;
  v_opponent_name text;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  select creator_id, opponent_id, opponent_name into v_creator_id, v_opponent_id, v_opponent_name
  from public.duels where id = p_duel_id for update;

  if not found then
    raise exception 'duel not found';
  end if;
  if v_creator_id = v_user_id then
    raise exception 'cannot join your own duel';
  end if;
  if v_opponent_id is not null then
    if v_opponent_id != v_user_id then
      raise exception 'duel already has an opponent';
    end if;
  elsif v_opponent_name is not null then
    raise exception 'duel already has an opponent';
  end if;

  update public.duels set opponent_id = v_user_id, status = 'accepted' where id = p_duel_id;
end;
$$;

grant execute on function public.join_duel to authenticated;

create or replace function public.accept_duel_invite(p_duel_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_opponent_id uuid;
  v_status text;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  select opponent_id, status into v_opponent_id, v_status
  from public.duels where id = p_duel_id for update;

  if v_opponent_id is null then
    raise exception 'duel not found';
  end if;
  if v_opponent_id != v_user_id then
    raise exception 'not your invite';
  end if;
  if v_status != 'pending' then
    raise exception 'invite is no longer pending';
  end if;

  update public.duels set status = 'accepted' where id = p_duel_id;
end;
$$;

grant execute on function public.accept_duel_invite to authenticated;

create or replace function public.decline_duel_invite(p_duel_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_opponent_id uuid;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  select opponent_id into v_opponent_id
  from public.duels where id = p_duel_id for update;

  if v_opponent_id is null or v_opponent_id != v_user_id then
    raise exception 'not your invite';
  end if;

  update public.duels set status = 'declined' where id = p_duel_id and status = 'pending';
end;
$$;

grant execute on function public.decline_duel_invite to authenticated;

create or replace function public.cancel_duel_invite(p_duel_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_creator_id uuid;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  select creator_id into v_creator_id
  from public.duels where id = p_duel_id for update;

  if v_creator_id is null or v_creator_id != v_user_id then
    raise exception 'not your duel';
  end if;

  update public.duels set status = 'cancelled' where id = p_duel_id and status = 'pending';
end;
$$;

grant execute on function public.cancel_duel_invite to authenticated;

-- Lets the invited player withdraw a still-pending friend invite once
-- they've noticed (via presence, see DuelMatch.tsx) that the sender has
-- disconnected — mirrors cancel_duel_invite above, but with the
-- caller/role flipped: that one only lets the creator cancel their own
-- invite, this only lets the opponent it was sent to expire it. Sets the
-- same 'cancelled' status cancel_duel_invite uses (not 'declined' — the
-- opponent didn't actively decline, the sender just vanished, and
-- 'declined' would show the creator a misleading "they declined" message).
create or replace function public.expire_duel_invite(p_duel_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_opponent_id uuid;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  select opponent_id into v_opponent_id
  from public.duels where id = p_duel_id for update;

  if v_opponent_id is null or v_opponent_id != v_user_id then
    raise exception 'not your invite';
  end if;

  update public.duels set status = 'cancelled' where id = p_duel_id and status = 'pending';
end;
$$;

grant execute on function public.expire_duel_invite to authenticated;

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

  insert into public.duels (id, mode, value, word_list, creator_name, creator_token, status)
  values (v_id, p_mode, p_value, p_word_list, trim(p_creator_name), v_token, 'open');

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
  set opponent_name = trim(p_name), opponent_token = v_token, status = 'accepted'
  where id = p_duel_id;

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
  select creator_token, opponent_token into v_creator_token, v_opponent_token
  from public.duels where id = p_duel_id for update;

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

create or replace function public.submit_duel_result(
  p_duel_id uuid,
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
  v_user_id uuid := auth.uid();
  v_creator_id uuid;
  v_opponent_id uuid;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  select creator_id, opponent_id into v_creator_id, v_opponent_id
  from public.duels where id = p_duel_id for update;

  if not found then
    raise exception 'duel not found';
  end if;

  if v_user_id = v_creator_id then
    update public.duels
    set creator_wpm = p_wpm, creator_accuracy = p_accuracy, creator_raw_wpm = p_raw_wpm, creator_time_elapsed = p_time_elapsed
    where id = p_duel_id;
  elsif v_user_id = v_opponent_id then
    update public.duels
    set opponent_wpm = p_wpm, opponent_accuracy = p_accuracy, opponent_raw_wpm = p_raw_wpm, opponent_time_elapsed = p_time_elapsed
    where id = p_duel_id;
  else
    raise exception 'not part of this duel';
  end if;
end;
$$;

grant execute on function public.submit_duel_result to authenticated;

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
      (creator_id, opponent_id, creator_name, opponent_name, creator_token, opponent_token, mode, value, word_list, status)
    values
      (v_creator_id, v_opponent_id, v_creator_name, v_opponent_name, v_new_creator_token, v_new_opponent_token, v_mode, v_value, p_word_list, 'accepted')
    returning id into v_new_id;

    update public.duels
    set rematch_duel_id = v_new_id, creator_rematch_token = v_new_creator_token, opponent_rematch_token = v_new_opponent_token
    where id = p_duel_id;
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
  select creator_id, opponent_id, creator_name, opponent_name, creator_token, opponent_token, mode, value,
         creator_wpm, opponent_wpm, creator_rematch, opponent_rematch, rematch_duel_id
  into v_creator_id, v_opponent_id, v_creator_name, v_opponent_name, v_creator_token, v_opponent_token, v_mode, v_value,
       v_creator_wpm, v_opponent_wpm, v_creator_rematch, v_opponent_rematch, v_rematch_duel_id
  from public.duels where id = p_duel_id for update;

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
      (creator_id, opponent_id, creator_name, opponent_name, creator_token, opponent_token, mode, value, word_list, status)
    values
      (v_creator_id, v_opponent_id, v_creator_name, v_opponent_name, v_new_creator_token, v_new_opponent_token, v_mode, v_value, p_word_list, 'accepted')
    returning id into v_new_id;

    update public.duels
    set rematch_duel_id = v_new_id, creator_rematch_token = v_new_creator_token, opponent_rematch_token = v_new_opponent_token
    where id = p_duel_id;
    v_rematch_duel_id := v_new_id;
  end if;

  return v_rematch_duel_id;
end;
$$;

grant execute on function public.request_guest_rematch to anon, authenticated;

-- Ranked matchmaking (see schema_021_ranked.sql): queue up and get
-- auto-matched against a random, similarly-rated opponent — unlike duels
-- above, which are always link/invite. One fixed format for everyone (30s
-- time), account-required (no guest path — elo needs a persistent
-- identity), and no persistent server process needed: matching happens
-- inside a single client-invoked RPC (try_match_ranked) called both on the
-- initial "find match" click and on a ~3s poll while waiting, so a lone
-- waiting player's own polling is what eventually matches them once someone
-- else joins, without any cron job or Edge Function.

-- One row per user actively searching for a match. last_seen_at is bumped
-- by every poll call so a row from an abandoned tab can be swept.
create table public.ranked_queue (
  user_id uuid primary key references auth.users (id) on delete cascade,
  elo integer not null,
  queued_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

-- player1_id is always < player2_id (enforced in try_match_ranked below) —
-- gives every function that locks both players' user_stats rows a free,
-- consistent lock order, so there's no deadlock risk between two matches
-- resolving concurrently. word_seed is generated here (server-side) rather
-- than by either client, since neither client knows in advance who they'll
-- be paired with — both sides independently derive the identical word list
-- from this shared seed (see generateSeededWordList in src/utils/words.ts).
create table public.ranked_matches (
  id uuid primary key default gen_random_uuid(),
  player1_id uuid not null references auth.users (id) on delete cascade,
  player2_id uuid not null references auth.users (id) on delete cascade,
  mode text not null default 'time',
  value int not null default 30,
  word_seed bigint not null default floor(random() * 2147483647)::bigint,
  status text not null default 'in_progress' check (status in ('in_progress', 'finished')),
  player1_elo_before int not null,
  player2_elo_before int not null,
  player1_elo_after int,
  player2_elo_after int,
  player1_wpm int,
  player1_accuracy int,
  player1_raw_wpm int,
  player1_time_elapsed numeric,
  player2_wpm int,
  player2_accuracy int,
  player2_raw_wpm int,
  player2_time_elapsed numeric,
  created_at timestamptz not null default now(),
  finished_at timestamptz,
  constraint ranked_matches_distinct_players check (player1_id <> player2_id)
);

-- Defense-in-depth: rejects a duplicate active match for the same pair even
-- if a future bug let two racing calls both try to insert one.
create unique index ranked_matches_active_pair_idx on public.ranked_matches
  (least(player1_id, player2_id), greatest(player1_id, player2_id)) where status = 'in_progress';

alter table public.ranked_queue enable row level security;
alter table public.ranked_matches enable row level security;

create policy "select own queue row" on public.ranked_queue
  for select using (auth.uid() = user_id);

create policy "select own ranked matches" on public.ranked_matches
  for select to authenticated using (auth.uid() = player1_id or auth.uid() = player2_id);

alter publication supabase_realtime add table public.ranked_matches;

-- Called on the "find match" click and every ~3s while waiting. Each call:
-- checks for an already-resolved match first (so polling doubles as "did I
-- get matched yet"), then scans the queue for the best opponent within an
-- elo band that widens the longer *that opponent* has waited, using
-- `for update skip locked` so a racing caller that can't lock a candidate
-- just moves on instead of blocking — no deadlock between two matchers.
-- The advisory lock keyed on the caller's own id serializes a single user's
-- own overlapping calls (double-click, a slow previous poll still in
-- flight), which is what actually prevents one user ending up in two
-- matches at once.
create or replace function public.try_match_ranked(p_elo integer)
returns table(match_id uuid, status text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing uuid;
  v_opp record;
  v_new_id uuid;
  v_base_band constant int := 75;
  v_widen_per_sec constant numeric := 8;
  v_max_band constant int := 400;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('ranked_queue:' || v_user_id::text, 0));

  delete from public.ranked_queue where last_seen_at < now() - interval '10 seconds';

  -- Table-qualified: `status` is also the name of this function's second
  -- OUT column (returns table(match_id uuid, status text)), so a bare
  -- `status` reference here is ambiguous between that and the column below
  -- — PL/pgSQL doesn't catch this at CREATE FUNCTION time, only when the
  -- function is actually called, raising "column reference is ambiguous".
  select rm.id into v_existing from public.ranked_matches rm
    where rm.status = 'in_progress' and (rm.player1_id = v_user_id or rm.player2_id = v_user_id) limit 1;
  if v_existing is not null then
    return query select v_existing, 'matched'::text;
    return;
  end if;

  select rq.user_id, rq.elo into v_opp
  from public.ranked_queue rq
  where rq.user_id <> v_user_id
    and abs(rq.elo - p_elo) <= least(v_max_band, v_base_band + v_widen_per_sec * extract(epoch from now() - rq.queued_at))
  order by rq.queued_at asc
  for update skip locked limit 1;

  if found then
    delete from public.ranked_queue where user_id in (v_user_id, v_opp.user_id);
    insert into public.ranked_matches (player1_id, player2_id, player1_elo_before, player2_elo_before)
    values (
      least(v_user_id, v_opp.user_id), greatest(v_user_id, v_opp.user_id),
      case when v_user_id < v_opp.user_id then p_elo else v_opp.elo end,
      case when v_user_id < v_opp.user_id then v_opp.elo else p_elo end
    )
    returning id into v_new_id;
    return query select v_new_id, 'matched'::text;
    return;
  end if;

  insert into public.ranked_queue (user_id, elo) values (v_user_id, p_elo)
    on conflict (user_id) do update set last_seen_at = now(), elo = excluded.elo;
  return query select null::uuid, 'queued'::text;
end;
$$;

grant execute on function public.try_match_ranked to authenticated;

create or replace function public.leave_ranked_queue()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.ranked_queue where user_id = auth.uid();
end;
$$;

grant execute on function public.leave_ranked_queue to authenticated;

-- Records one side's result; once both sides are in, computes elo for both
-- atomically (standard elo: expected = 1/(1+10^((opp-mine)/400)), new =
-- old + K*(actual-expected)) and locks both user_stats rows in ascending
-- user_id order — guaranteed deadlock-free since player1_id < player2_id
-- always holds by construction above. K=80 for a player's first 5 ranked
-- games (placements converge faster), K=32 after, tracked independently
-- per player so one side being in placements and the other not is still
-- correct. peak_elo (used to gate rank-tier rewards) only ever increases,
-- so a later rating dip doesn't strip an already-earned reward.
create or replace function public.submit_ranked_result(
  p_match_id uuid,
  p_wpm int,
  p_accuracy int,
  p_raw_wpm int,
  p_time_elapsed numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  m record;
  v_is_p1 boolean;
  v_exp1 numeric;
  v_exp2 numeric;
  v_act1 numeric;
  v_act2 numeric;
  v_k1 int;
  v_k2 int;
  v_new1 int;
  v_new2 int;
  v_p1_games int;
  v_p2_games int;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  select * into m from public.ranked_matches where id = p_match_id for update;
  if not found then
    raise exception 'match not found';
  end if;
  if v_user_id != m.player1_id and v_user_id != m.player2_id then
    raise exception 'not part of this match';
  end if;

  v_is_p1 := v_user_id = m.player1_id;
  if (v_is_p1 and m.player1_wpm is not null) or (not v_is_p1 and m.player2_wpm is not null) then
    raise exception 'already submitted';
  end if;

  if v_is_p1 then
    update public.ranked_matches set
      player1_wpm = p_wpm, player1_accuracy = p_accuracy, player1_raw_wpm = p_raw_wpm, player1_time_elapsed = p_time_elapsed
    where id = p_match_id;
  else
    update public.ranked_matches set
      player2_wpm = p_wpm, player2_accuracy = p_accuracy, player2_raw_wpm = p_raw_wpm, player2_time_elapsed = p_time_elapsed
    where id = p_match_id;
  end if;

  select * into m from public.ranked_matches where id = p_match_id;
  if m.player1_wpm is null or m.player2_wpm is null then
    return; -- still waiting on the other side
  end if;

  select ranked_games_played into v_p1_games from public.user_stats where user_id = m.player1_id for update;
  select ranked_games_played into v_p2_games from public.user_stats where user_id = m.player2_id for update;

  v_exp1 := 1.0 / (1 + power(10, (m.player2_elo_before - m.player1_elo_before) / 400.0));
  v_exp2 := 1 - v_exp1;
  v_act1 := case when m.player1_wpm > m.player2_wpm then 1 when m.player1_wpm = m.player2_wpm then 0.5 else 0 end;
  v_act2 := 1 - v_act1;
  v_k1 := case when v_p1_games < 5 then 80 else 32 end;
  v_k2 := case when v_p2_games < 5 then 80 else 32 end;
  v_new1 := round(m.player1_elo_before + v_k1 * (v_act1 - v_exp1));
  v_new2 := round(m.player2_elo_before + v_k2 * (v_act2 - v_exp2));

  update public.user_stats set
    elo = v_new1,
    peak_elo = greatest(peak_elo, v_new1),
    ranked_games_played = ranked_games_played + 1,
    ranked_wins = ranked_wins + case when v_act1 = 1 then 1 else 0 end,
    ranked_losses = ranked_losses + case when v_act1 = 0 then 1 else 0 end,
    ranked_draws = ranked_draws + case when v_act1 = 0.5 then 1 else 0 end,
    updated_at = now()
  where user_id = m.player1_id;

  update public.user_stats set
    elo = v_new2,
    peak_elo = greatest(peak_elo, v_new2),
    ranked_games_played = ranked_games_played + 1,
    ranked_wins = ranked_wins + case when v_act2 = 1 then 1 else 0 end,
    ranked_losses = ranked_losses + case when v_act2 = 0 then 1 else 0 end,
    ranked_draws = ranked_draws + case when v_act2 = 0.5 then 1 else 0 end,
    updated_at = now()
  where user_id = m.player2_id;

  update public.ranked_matches set
    player1_elo_after = v_new1, player2_elo_after = v_new2, status = 'finished', finished_at = now()
  where id = p_match_id;
end;
$$;

grant execute on function public.submit_ranked_result to authenticated;

-- Lets a signed-in user permanently delete their own account. Every table
-- with a foreign key to auth.users(id) uses "on delete cascade" above
-- except public.bug_reports, which intentionally uses "on delete set null"
-- so a submitted bug report persists for the dashboard/service role even
-- after the reporter's account is gone — so deleting the auth.users row
-- here cleans up all other app data automatically via cascade, with that
-- one deliberate exception.
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  delete from auth.users where id = v_user_id;
end;
$$;

grant execute on function public.delete_own_account to authenticated;

-- Ranked-tier rewards: a username color, not a border. Unlock logic (gated
-- on peak_elo) lives in NAME_COLOR_CATALOG in src/utils/cosmetics.tsx, same
-- pattern as every other cosmetic.
create table public.name_color_catalog (id text primary key);

insert into public.name_color_catalog (id) values
  ('default'), ('bronze'), ('silver'), ('gold'), ('platinum'), ('diamond'), ('master'), ('grandmaster');

alter table public.user_stats
  add column equipped_name_color text not null default 'default' references public.name_color_catalog (id);

-- Mirrors set_equipped_accent_color/set_equipped_cosmetics: the foreign key
-- above rejects an unknown id; actual unlock-eligibility (peak_elo) is
-- checked client-side, same as every other cosmetic here.
create or replace function public.set_equipped_name_color(p_color_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  update public.user_stats
  set equipped_name_color = p_color_id, updated_at = now()
  where user_id = v_user_id;
end;
$$;

grant execute on function public.set_equipped_name_color to authenticated;

-- Lets a signed-in user change their own username, at most once every 7
-- days (see username_changed_at above).
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

  -- Mirrors the column's own check constraint, just to fail with a
  -- friendlier message before hitting a raw constraint-violation error —
  -- the constraint itself is still what's actually authoritative here.
  if p_new_username !~ '^[A-Za-z0-9]{3,20}$' then
    raise exception 'invalid username';
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

  -- Keeps auth.users' signup-time metadata in sync too, purely so the
  -- Supabase dashboard's Auth > Users view doesn't show a stale username —
  -- nothing in the app itself reads username from auth.users.
  update auth.users
  set raw_user_meta_data = raw_user_meta_data || jsonb_build_object('username', p_new_username)
  where id = v_user_id;
end;
$$;

grant execute on function public.change_username to authenticated;

-- Cosmetic badges: a small icon+label chip next to a username, similar to
-- name colors but boolean-gated rather than a stats.peakElo threshold. Unlike
-- name colors/borders (whose unlock state is purely a function of stats
-- already on the row, computed client-side), badge eligibility needs facts
-- that can't be derived that way (signup order, a real-world donation,
-- global rank across everyone), so each one is tracked as its own persisted
-- boolean here instead of a client-side isUnlocked(stats) check.
create table public.badge_catalog (id text primary key);

insert into public.badge_catalog (id) values ('founder'), ('supporter'), ('fast_typer'), ('dev'), ('goat');

alter table public.user_stats
  add column is_founder boolean not null default false,
  add column is_supporter boolean not null default false,
  add column is_fast_typer boolean not null default false,
  add column is_goat boolean not null default false,
  add column equipped_badge text references public.badge_catalog (id);

-- Backfill Founder for accounts that already existed before this migration
-- ran — the handle_new_user trigger below only decides it going forward, at
-- signup time, for brand-new accounts.
update public.user_stats us
set is_founder = true
from (select id from auth.users order by created_at asc limit 25) f
where us.user_id = f.id;

-- GOAT has no automatic grant — toggled by hand in the SQL Editor per
-- account (see schema_032), same as Supporter.

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

-- Learn mode: keybr-style letter-unlocking practice. Unlock eligibility
-- (per-letter EMA accuracy, reps-since-unlock, which letter unlocks next)
-- is computed entirely client-side (src/utils/learnMode.ts) as a pure
-- function of this row's own contents — same precedent as cosmetics
-- (set_equipped_cosmetics etc.): this table just persists the result, with
-- no competitive/leaderboard/XP stake riding on it either way.
create table public.learn_progress (
  user_id uuid primary key references auth.users (id) on delete cascade,
  keyboard_layout text not null check (keyboard_layout in ('qwerty', 'colemak', 'dvorak')),
  unlocked_letters text not null,
  letter_accuracy jsonb not null default '{}'::jsonb,
  total_reps_since_unlock integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.learn_progress enable row level security;

-- No insert/update policy: every write goes through save_learn_progress
-- below (security definer, bypasses RLS) — this is only needed for the
-- client's own direct read on page load.
create policy "select own learn progress" on public.learn_progress
  for select using (auth.uid() = user_id);

-- Upserts the caller's own row. Trusts client-provided values with no
-- server-side business-logic validation (same as set_equipped_cosmetics) —
-- appropriate here since this data has zero effect on anything competitive.
create or replace function public.save_learn_progress(
  p_keyboard_layout text,
  p_unlocked_letters text,
  p_letter_accuracy jsonb,
  p_total_reps_since_unlock integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  insert into public.learn_progress (user_id, keyboard_layout, unlocked_letters, letter_accuracy, total_reps_since_unlock, updated_at)
  values (v_user_id, p_keyboard_layout, p_unlocked_letters, p_letter_accuracy, p_total_reps_since_unlock, now())
  on conflict (user_id) do update
  set keyboard_layout = excluded.keyboard_layout,
      unlocked_letters = excluded.unlocked_letters,
      letter_accuracy = excluded.letter_accuracy,
      total_reps_since_unlock = excluded.total_reps_since_unlock,
      updated_at = now();
end;
$$;

grant execute on function public.save_learn_progress to authenticated;

-- Contact form for the /contact page — general questions, feedback, and
-- feature requests, alongside the existing bug-report table. Same
-- insert-only pattern as public.bug_reports: no select policy granted to
-- anon/authenticated, so submissions are only readable via the Supabase
-- dashboard (service role, bypasses RLS).
create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  message text not null,
  contact_email text,
  page_url text,
  user_agent text,
  created_at timestamptz not null default now()
);

alter table public.contact_messages enable row level security;

create policy "insert contact messages" on public.contact_messages
  for insert to anon, authenticated with check (true);
