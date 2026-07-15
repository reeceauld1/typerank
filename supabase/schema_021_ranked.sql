-- Ranked matchmaking: queue up and get auto-matched against a random,
-- similarly-rated opponent (unlike duels, which are always link/invite —
-- see schema_013_duels.sql onward). One fixed format for everyone (30s
-- time), account-required (no guest path — elo needs a persistent
-- identity), and no persistent server process needed: matching happens
-- inside a single client-invoked RPC (try_match_ranked) called both on the
-- initial "find match" click and on a ~3s poll while waiting, so a lone
-- waiting player's own polling is what eventually matches them once someone
-- else joins, without any cron job or Edge Function.
alter table public.user_stats add column elo integer not null default 1000;
alter table public.user_stats add column peak_elo integer not null default 1000;
alter table public.user_stats add column ranked_games_played integer not null default 0;
alter table public.user_stats add column ranked_wins integer not null default 0;
alter table public.user_stats add column ranked_losses integer not null default 0;
alter table public.user_stats add column ranked_draws integer not null default 0;

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
