-- Backs the GitHub-style activity chart on the profile page (see
-- TestActivityChart.tsx): one row per day with at least one completed test,
-- for the last 371 days (53 weeks — a full GitHub-style grid). test_history
-- itself is owner-only (see "select own history"), but daily test counts are
-- as public as every other stat already shown on a profile (total_tests,
-- best_wpm, elo, ...), so this is security definer and callable by anyone —
-- p_user_id lets it read another user's activity the same way user_stats
-- already can (see "select any stats anon"), defaulting to the caller's own
-- when omitted.
create or replace function public.get_daily_test_counts(p_user_id uuid default null)
returns table (test_date date, test_count integer)
language sql
stable
security definer
set search_path = public
as $$
  select created_at::date as test_date, count(*)::integer as test_count
  from public.test_history
  where user_id = coalesce(p_user_id, auth.uid())
    and created_at >= now() - interval '371 days'
  group by test_date
  order by test_date;
$$;

grant execute on function public.get_daily_test_counts to anon, authenticated;
