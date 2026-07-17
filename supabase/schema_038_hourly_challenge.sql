-- Hourly challenge ("complete N tests this hour"), same shape as
-- claim_daily_challenge but keyed by the UTC hour (date_trunc('hour', now())
-- — Supabase's DB session runs in UTC), matching the client's hourStart()
-- in src/utils/hourlyChallenge.ts.
create table public.hourly_challenge_claims (
  user_id uuid not null references auth.users (id) on delete cascade,
  challenge_hour timestamptz not null,
  mode text not null,
  value integer not null,
  tests_target integer not null,
  xp_bonus integer not null,
  claimed_at timestamptz not null default now(),
  primary key (user_id, challenge_hour)
);

alter table public.hourly_challenge_claims enable row level security;

create policy "select own hourly claims" on public.hourly_challenge_claims
  for select using (auth.uid() = user_id);
create policy "insert own hourly claims" on public.hourly_challenge_claims
  for insert with check (auth.uid() = user_id);

-- Claims this hour's challenge and awards its XP bonus exactly once,
-- mirroring claim_daily_challenge but keyed by hour instead of day.
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
begin
  if v_user_id is null then
    raise exception 'not authenticated';
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

grant execute on function public.claim_hourly_challenge to authenticated;
