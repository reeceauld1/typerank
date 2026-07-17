-- try_match_ranked trusted the client-supplied p_elo completely: it fed
-- straight into ranked_queue.elo and, via that, into
-- ranked_matches.player1_elo_before/player2_elo_before — the actual inputs
-- submit_ranked_result's elo-swing formula uses. Calling
-- supabase.rpc('try_match_ranked', { p_elo: -9999 }) (or any fake value)
-- directly meant your *reported* rating, not your real user_stats.elo,
-- decided how big a swing a match produced — e.g. reporting an
-- artificially low elo made the expected-win-probability near zero, so
-- even a normal win paid out a huge, completely disconnected-from-reality
-- rating jump.
--
-- p_elo is kept in the signature so the client's existing call
-- (supabase.rpc('try_match_ranked', { p_elo: stats.elo })) still matches,
-- but its value is now ignored — the caller's real elo is looked up from
-- user_stats instead, the same fix pattern as schema_039.
create or replace function public.try_match_ranked(p_elo integer)
returns table(match_id uuid, status text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_my_elo integer;
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

  select elo into v_my_elo from public.user_stats where user_id = v_user_id;
  if v_my_elo is null then
    raise exception 'stats not found';
  end if;

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
    and abs(rq.elo - v_my_elo) <= least(v_max_band, v_base_band + v_widen_per_sec * extract(epoch from now() - rq.queued_at))
  order by rq.queued_at asc
  for update skip locked limit 1;

  if found then
    delete from public.ranked_queue where user_id in (v_user_id, v_opp.user_id);
    insert into public.ranked_matches (player1_id, player2_id, player1_elo_before, player2_elo_before)
    values (
      least(v_user_id, v_opp.user_id), greatest(v_user_id, v_opp.user_id),
      case when v_user_id < v_opp.user_id then v_my_elo else v_opp.elo end,
      case when v_user_id < v_opp.user_id then v_opp.elo else v_my_elo end
    )
    returning id into v_new_id;
    return query select v_new_id, 'matched'::text;
    return;
  end if;

  insert into public.ranked_queue (user_id, elo) values (v_user_id, v_my_elo)
    on conflict (user_id) do update set last_seen_at = now(), elo = excluded.elo;
  return query select null::uuid, 'queued'::text;
end;
$$;

-- submit_guest_duel_result / submit_duel_result had the same missing-
-- validation issue as record_test_result/submit_ranked_result before
-- schema_039 — p_wpm/p_accuracy/p_raw_wpm were stored as sent, with no
-- bounds check at all, letting anyone force a "win" (or grief an opponent)
-- in any duel by reporting an absurd wpm directly via the RPC.
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
  if p_wpm is null or p_wpm < 0 or p_wpm > 400
    or p_raw_wpm is null or p_raw_wpm < 0 or p_raw_wpm > 400
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

  if p_wpm is null or p_wpm < 0 or p_wpm > 400
    or p_raw_wpm is null or p_raw_wpm < 0 or p_raw_wpm > 400
    or p_wpm > p_raw_wpm then
    raise exception 'implausible wpm';
  end if;
  if p_accuracy is null or p_accuracy < 0 or p_accuracy > 100 then
    raise exception 'invalid accuracy';
  end if;
  if p_time_elapsed is null or p_time_elapsed <= 0 or p_time_elapsed > 200 then
    raise exception 'implausible time_elapsed';
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
