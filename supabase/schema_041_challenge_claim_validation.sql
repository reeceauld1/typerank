-- claim_daily_challenge / claim_hourly_challenge / claim_weekly_challenge
-- accepted p_tests_target and p_xp_bonus straight from the client, with
-- only a once-per-period uniqueness constraint standing in the way.
-- Nothing checked that xp_bonus matched the real (fixed) reward for that
-- challenge type, that tests_target was one of the real pool values, or —
-- critically — that the caller had actually completed that many matching
-- tests in the period at all. Calling
--   supabase.rpc('claim_daily_challenge', { p_mode: 'time', p_value: 10,
--     p_tests_target: 1, p_xp_bonus: 999999999 })
-- once a day (same for hourly/weekly) granted arbitrary xp with zero
-- tests ever taken.
--
-- Fix: xp_bonus and tests_target must match one of the real pool entries
-- (src/utils/dailyChallenge.ts / hourlyChallenge.ts — the exact rotated
-- combo for that identity/period isn't re-derived here, just that the
-- claimed combo is a real, legitimately-difficulty-matched one; picking
-- the easiest of the 6 instead of the one actually assigned is a much
-- smaller gap than "no tests required at all"), and test_history is
-- queried directly to confirm the caller actually has enough qualifying
-- tests in the period, rather than trusting that they do.
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
  v_count integer;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  if p_xp_bonus <> 2500 then
    raise exception 'invalid xp bonus';
  end if;
  if not (
    (p_mode = 'time' and p_value = 10 and p_tests_target = 15) or
    (p_mode = 'time' and p_value = 30 and p_tests_target = 5) or
    (p_mode = 'time' and p_value = 60 and p_tests_target = 3) or
    (p_mode = 'words' and p_value = 10 and p_tests_target = 15) or
    (p_mode = 'words' and p_value = 25 and p_tests_target = 5) or
    (p_mode = 'words' and p_value = 50 and p_tests_target = 3)
  ) then
    raise exception 'invalid challenge parameters';
  end if;

  select count(*) into v_count from public.test_history
  where user_id = v_user_id and mode = p_mode and value = p_value and created_at::date = current_date;
  if v_count < p_tests_target then
    raise exception 'not enough tests completed';
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

-- Same fix as claim_daily_challenge above, pool values from
-- src/utils/hourlyChallenge.ts.
create or replace function public.claim_hourly_challenge(
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
  v_count integer;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  if p_xp_bonus <> 500 then
    raise exception 'invalid xp bonus';
  end if;
  if not (
    (p_mode = 'time' and p_value = 10 and p_tests_target = 3) or
    (p_mode = 'time' and p_value = 30 and p_tests_target = 1) or
    (p_mode = 'time' and p_value = 60 and p_tests_target = 1) or
    (p_mode = 'words' and p_value = 10 and p_tests_target = 3) or
    (p_mode = 'words' and p_value = 25 and p_tests_target = 1) or
    (p_mode = 'words' and p_value = 50 and p_tests_target = 1)
  ) then
    raise exception 'invalid challenge parameters';
  end if;

  select count(*) into v_count from public.test_history
  where user_id = v_user_id and mode = p_mode and value = p_value and created_at >= date_trunc('hour', now());
  if v_count < p_tests_target then
    raise exception 'not enough tests completed';
  end if;

  insert into public.hourly_challenge_claims (user_id, challenge_hour, mode, value, tests_target, xp_bonus)
  values (v_user_id, date_trunc('hour', now()), p_mode, p_value, p_tests_target, p_xp_bonus)
  on conflict (user_id, challenge_hour) do nothing;

  if not found then
    return false;
  end if;

  update public.user_stats set total_xp = total_xp + p_xp_bonus, updated_at = now()
  where user_id = v_user_id;

  return true;
end;
$$;

-- Same fix as the two above. Weekly has a single fixed target/bonus (no
-- rotating pool), and counts any test regardless of mode/value — but
-- p_week_start was previously trusted outright too, letting a caller claim
-- many distinct past/future week_start dates in a row (the uniqueness
-- constraint only blocks re-claiming the *same* week_start twice). It must
-- now match the real current week.
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
  v_week_start date := date_trunc('week', current_date)::date;
  v_count integer;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  if p_week_start <> v_week_start then
    raise exception 'invalid week';
  end if;
  if p_tests_target <> 100 or p_xp_bonus <> 15000 then
    raise exception 'invalid challenge parameters';
  end if;

  select count(*) into v_count from public.test_history
  where user_id = v_user_id and created_at >= v_week_start and created_at < v_week_start + 7;
  if v_count < p_tests_target then
    raise exception 'not enough tests completed';
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

-- ============================================================
-- Data repair: revoke only unambiguously fraudulent claims — ones whose
-- xp_bonus or tests_target/mode/value combo could never have been produced
-- by the real client (a legitimate claim always used one of the fixed
-- constants/pool combos above). Claims with a valid combo are left alone:
-- there's no reliable way to tell in hindsight whether the caller actually
-- had enough qualifying tests at claim time, and guessing wrong risks
-- clawing back a real reward.
-- ============================================================

with bad as (
  delete from public.daily_challenge_claims
  where xp_bonus <> 2500
     or not (
       (mode = 'time' and value = 10 and tests_target = 15) or
       (mode = 'time' and value = 30 and tests_target = 5) or
       (mode = 'time' and value = 60 and tests_target = 3) or
       (mode = 'words' and value = 10 and tests_target = 15) or
       (mode = 'words' and value = 25 and tests_target = 5) or
       (mode = 'words' and value = 50 and tests_target = 3)
     )
  returning user_id, xp_bonus
)
update public.user_stats us
set total_xp = greatest(0, us.total_xp - b.xp_sum), updated_at = now()
from (select user_id, sum(xp_bonus) as xp_sum from bad group by user_id) b
where us.user_id = b.user_id;

with bad as (
  delete from public.hourly_challenge_claims
  where xp_bonus <> 500
     or not (
       (mode = 'time' and value = 10 and tests_target = 3) or
       (mode = 'time' and value = 30 and tests_target = 1) or
       (mode = 'time' and value = 60 and tests_target = 1) or
       (mode = 'words' and value = 10 and tests_target = 3) or
       (mode = 'words' and value = 25 and tests_target = 1) or
       (mode = 'words' and value = 50 and tests_target = 1)
     )
  returning user_id, xp_bonus
)
update public.user_stats us
set total_xp = greatest(0, us.total_xp - b.xp_sum), updated_at = now()
from (select user_id, sum(xp_bonus) as xp_sum from bad group by user_id) b
where us.user_id = b.user_id;

with bad as (
  delete from public.weekly_challenge_claims
  where xp_bonus <> 15000 or tests_target <> 100
  returning user_id, xp_bonus
)
update public.user_stats us
set total_xp = greatest(0, us.total_xp - b.xp_sum), updated_at = now()
from (select user_id, sum(xp_bonus) as xp_sum from bad group by user_id) b
where us.user_id = b.user_id;
