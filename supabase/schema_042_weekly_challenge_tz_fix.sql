-- claim_weekly_challenge (schema_041) started requiring p_week_start to
-- exactly equal date_trunc('week', current_date)::date, computed in UTC.
-- But the client derives its week boundary from LOCAL midnight
-- (weeklyChallenge.ts getWeekStart), then serializes it with
-- .toISOString() -- which converts back to UTC. For any timezone ahead of
-- UTC (positive offset), local midnight Monday falls on UTC *Sunday*
-- afternoon/evening, so weekKey() sends Sunday's date, one day behind the
-- server's UTC Monday. The strict equality check then rejected every
-- legitimate claim from those timezones with 'invalid week', while
-- hourly/daily never had this exposure since they don't accept a
-- client-supplied date/hour at all.
--
-- The only possible drift (since no timezone offset exceeds 24h) is
-- exactly one day short of the server's real week start, never over --
-- so widen the check to accept either value instead of loosening it into
-- an exploitable range. A given client is deterministic for any real
-- week (always the same one of the two, based on actual local time), so
-- this doesn't let anyone double-claim a single real week or walk
-- multiple past weeks.
drop function if exists public.claim_weekly_challenge(date, integer, integer);

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

  if p_week_start <> v_week_start and p_week_start <> v_week_start - 1 then
    raise exception 'invalid week';
  end if;
  if p_tests_target <> 100 or p_xp_bonus <> 15000 then
    raise exception 'invalid challenge parameters';
  end if;

  select count(*) into v_count from public.test_history
  where user_id = v_user_id and created_at >= p_week_start and created_at < p_week_start + 7;
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
