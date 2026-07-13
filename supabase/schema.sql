-- TypeRank account system: run this once in the Supabase SQL Editor
-- (Project → SQL Editor → New query → paste → Run).

-- One row per user, holding aggregate stats. Individual test results live
-- in test_history; these are the running totals used for level/profile display.
create table public.user_stats (
  user_id uuid primary key references auth.users (id) on delete cascade,
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
  updated_at timestamptz not null default now()
);

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

  insert into public.user_stats (user_id) values (v_user_id)
  on conflict (user_id) do nothing;

  update public.user_stats set
    total_tests = total_tests + 1,
    total_xp = total_xp + p_xp_earned,
    total_time_typed = total_time_typed + p_time_elapsed,
    total_accuracy_sum = total_accuracy_sum + p_accuracy,
    total_wpm_sum = total_wpm_sum + p_wpm,
    best_wpm_time10 = case when p_mode = 'time' and p_value = 10
      then greatest(best_wpm_time10, p_wpm) else best_wpm_time10 end,
    best_wpm_time30 = case when p_mode = 'time' and p_value = 30
      then greatest(best_wpm_time30, p_wpm) else best_wpm_time30 end,
    best_wpm_time60 = case when p_mode = 'time' and p_value = 60
      then greatest(best_wpm_time60, p_wpm) else best_wpm_time60 end,
    best_wpm_words10 = case when p_mode = 'words' and p_value = 10
      then greatest(best_wpm_words10, p_wpm) else best_wpm_words10 end,
    best_wpm_words25 = case when p_mode = 'words' and p_value = 25
      then greatest(best_wpm_words25, p_wpm) else best_wpm_words25 end,
    best_wpm_words50 = case when p_mode = 'words' and p_value = 50
      then greatest(best_wpm_words50, p_wpm) else best_wpm_words50 end,
    updated_at = now()
  where user_id = v_user_id;
end;
$$;

grant execute on function public.record_test_result to authenticated;

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

-- One-time import of a brand-new account's pre-existing localStorage stats
-- (only ever meaningful the moment a user_stats row doesn't exist yet).
create or replace function public.import_local_stats(
  p_total_tests integer,
  p_total_xp integer,
  p_total_time_typed double precision,
  p_total_accuracy_sum double precision,
  p_total_wpm_sum double precision,
  p_best_wpm_time10 integer,
  p_best_wpm_time30 integer,
  p_best_wpm_time60 integer,
  p_best_wpm_words10 integer,
  p_best_wpm_words25 integer,
  p_best_wpm_words50 integer
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

  insert into public.user_stats (
    user_id, total_tests, total_xp, total_time_typed, total_accuracy_sum, total_wpm_sum,
    best_wpm_time10, best_wpm_time30, best_wpm_time60,
    best_wpm_words10, best_wpm_words25, best_wpm_words50
  ) values (
    v_user_id, p_total_tests, p_total_xp, p_total_time_typed, p_total_accuracy_sum, p_total_wpm_sum,
    p_best_wpm_time10, p_best_wpm_time30, p_best_wpm_time60,
    p_best_wpm_words10, p_best_wpm_words25, p_best_wpm_words50
  )
  on conflict (user_id) do nothing;
end;
$$;

grant execute on function public.import_local_stats to authenticated;

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
