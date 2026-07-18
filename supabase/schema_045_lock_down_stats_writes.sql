-- Bug report: "my account now shows a 2,238,644 avg WPM, which was
-- accepted and saved... any logged-in user can forge WPM stats."
--
-- Root cause: "update own stats" (schema.sql line ~77) is a bare
--   for update using (auth.uid() = user_id)
-- with no `with check` and no column restriction. Postgres treats a
-- missing `with check` on an UPDATE policy as "reuse the USING clause",
-- so the *only* thing enforced was "this is your own row" — every write
-- in the app already goes through a security-definer RPC (record_test_result,
-- submit_ranked_result, set_equipped_cosmetics, etc. — all bypass RLS by
-- running as the function owner), so this policy served no purpose except
-- letting anyone run, straight from devtools with their own session:
--   supabase.from('user_stats').update({ total_wpm_sum: 2238644 }).eq('user_id', me)
-- completely bypassing record_test_result's 400-wpm cap and every other
-- check it does. Not limited to wpm either — the same hole lets a user set
-- elo, total_xp, is_founder/is_goat, equipped_badge, anything, to whatever
-- they want. The equivalent hole on test_history's "insert own history"
-- policy (with check (auth.uid() = user_id), no value validation) let a
-- user insert fabricated rows directly too — same fix, same reasoning,
-- and those fake rows could otherwise satisfy the claim_daily/hourly/
-- weekly_challenge RPCs' "do you actually have N qualifying tests" check
-- without ever really typing.
--
-- Fix: drop both policies outright. RLS stays enabled with no UPDATE
-- policy on user_stats and no INSERT policy on test_history, so direct
-- client writes to either are now unconditionally denied — every
-- legitimate write already happens inside a security-definer function,
-- which isn't subject to RLS at all, so this has zero effect on any real
-- feature.
drop policy if exists "update own stats" on public.user_stats;
drop policy if exists "insert own history" on public.test_history;

-- Also tightens the wpm ceiling itself. 400 was a round "generous enough"
-- guess; the actual highest wpm ever recorded by a human on a comparable
-- short-burst typing-test platform (Monkeytype/TypeRacer-style, the same
-- format this app uses) is ~305 wpm (MythicalRocket, informally verified
-- but the highest credible figure found — ahead of Sean Wrona's 256 wpm
-- competitive record and Barbara Blackburn's 212 wpm Guinness-certified
-- peak on sustained prose, which measures something different than a
-- 10-second burst). +10 headroom for genuine variance = 315, replacing
-- 400 everywhere a wpm ceiling is checked.
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
  v_wpm integer;
  v_raw_wpm integer;
  v_accuracy integer;
  v_is_ranked boolean;
  v_difficulty numeric;
  v_multiplier numeric;
  v_xp integer;
  v_milestone_bonus integer := 0;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  if p_time_elapsed is null or p_time_elapsed <= 0 or p_time_elapsed > 660 then
    raise exception 'implausible time_elapsed';
  end if;
  if p_correct_chars is null or p_correct_chars < 0 or p_incorrect_chars is null or p_incorrect_chars < 0 then
    raise exception 'invalid character counts';
  end if;

  v_accuracy := greatest(0, least(100, coalesce(p_accuracy, 0)));

  v_wpm := round(p_correct_chars / 5.0 / (p_time_elapsed / 60.0));
  v_raw_wpm := round((p_correct_chars + p_incorrect_chars) / 5.0 / (p_time_elapsed / 60.0));

  if v_wpm > 315 or v_raw_wpm > 315 then
    raise exception 'implausible wpm';
  end if;

  v_is_ranked := (p_mode = 'time' and p_value in (10, 30, 60)) or (p_mode = 'words' and p_value in (10, 25, 50));
  v_multiplier := case when v_is_ranked then 1.0 else 0.5 end;
  v_difficulty := case
    when p_mode = 'time' and p_value = 60 then 1.25
    when p_mode = 'time' and p_value = 30 then 1.1
    when p_mode = 'words' and p_value = 50 then 1.25
    when p_mode = 'words' and p_value = 25 then 1.1
    else 1.0
  end;
  v_xp := floor(floor(v_wpm * v_accuracy / 100.0) * v_difficulty * v_multiplier);

  if v_accuracy >= 95 then
    v_milestone_bonus := case
      when p_mode = 'time' and p_value = 10 and v_wpm >= 100 then 100
      when p_mode = 'time' and p_value = 30 and v_wpm >= 80 then 150
      when p_mode = 'time' and p_value = 60 and v_wpm >= 70 then 200
      when p_mode = 'words' and p_value = 10 and v_wpm >= 100 then 100
      when p_mode = 'words' and p_value = 25 and v_wpm >= 90 then 150
      when p_mode = 'words' and p_value = 50 and v_wpm >= 80 then 200
      else 0
    end;
  end if;
  v_xp := v_xp + v_milestone_bonus;

  insert into public.test_history (
    user_id, mode, value, wpm, accuracy, raw_wpm,
    correct_chars, incorrect_chars, time_elapsed, xp_earned
  ) values (
    v_user_id, p_mode, p_value, v_wpm, v_accuracy, v_raw_wpm,
    p_correct_chars, p_incorrect_chars, p_time_elapsed, v_xp
  );

  update public.user_stats set
    total_tests = total_tests + 1,
    total_xp = total_xp + v_xp,
    total_time_typed = total_time_typed + p_time_elapsed,
    total_accuracy_sum = total_accuracy_sum + v_accuracy,
    total_wpm_sum = total_wpm_sum + v_wpm,
    best_wpm_time10 = case when p_mode = 'time' and p_value = 10 and v_accuracy >= 40
      then greatest(best_wpm_time10, v_wpm) else best_wpm_time10 end,
    best_wpm_time30 = case when p_mode = 'time' and p_value = 30 and v_accuracy >= 40
      then greatest(best_wpm_time30, v_wpm) else best_wpm_time30 end,
    best_wpm_time60 = case when p_mode = 'time' and p_value = 60 and v_accuracy >= 40
      then greatest(best_wpm_time60, v_wpm) else best_wpm_time60 end,
    best_wpm_words10 = case when p_mode = 'words' and p_value = 10 and v_accuracy >= 40
      then greatest(best_wpm_words10, v_wpm) else best_wpm_words10 end,
    best_wpm_words25 = case when p_mode = 'words' and p_value = 25 and v_accuracy >= 40
      then greatest(best_wpm_words25, v_wpm) else best_wpm_words25 end,
    best_wpm_words50 = case when p_mode = 'words' and p_value = 50 and v_accuracy >= 40
      then greatest(best_wpm_words50, v_wpm) else best_wpm_words50 end,
    updated_at = now()
  where user_id = v_user_id;
end;
$$;

grant execute on function public.record_test_result to authenticated;

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

-- submit_ranked_result's wpm cap, same tightening. Body otherwise
-- unchanged from schema.sql - only the > 400 literals become > 315.
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

  if p_wpm is null or p_wpm < 0 or p_wpm > 315
    or p_raw_wpm is null or p_raw_wpm < 0 or p_raw_wpm > 315
    or p_wpm > p_raw_wpm then
    raise exception 'implausible wpm';
  end if;
  if p_accuracy is null or p_accuracy < 0 or p_accuracy > 100 then
    raise exception 'invalid accuracy';
  end if;
  if p_time_elapsed is null or p_time_elapsed <= 0 or p_time_elapsed > 60 then
    raise exception 'implausible time_elapsed';
  end if;

  select * into m from public.ranked_matches where id = p_match_id for update;
  if not found then
    raise exception 'match not found';
  end if;
  if m.status <> 'in_progress' then
    raise exception 'match not in progress';
  end if;

  v_is_p1 := v_user_id = m.player1_id;
  if not v_is_p1 and v_user_id <> m.player2_id then
    raise exception 'not part of this match';
  end if;

  if v_is_p1 then
    if m.player1_wpm is not null then
      raise exception 'already submitted';
    end if;
    update public.ranked_matches set player1_wpm = p_wpm, player1_accuracy = p_accuracy,
      player1_raw_wpm = p_raw_wpm, player1_time_elapsed = p_time_elapsed
      where id = p_match_id;
  else
    if m.player2_wpm is not null then
      raise exception 'already submitted';
    end if;
    update public.ranked_matches set player2_wpm = p_wpm, player2_accuracy = p_accuracy,
      player2_raw_wpm = p_raw_wpm, player2_time_elapsed = p_time_elapsed
      where id = p_match_id;
  end if;

  select * into m from public.ranked_matches where id = p_match_id;
  if m.player1_wpm is null or m.player2_wpm is null then
    return;
  end if;

  v_exp1 := 1.0 / (1.0 + power(10.0, (m.player2_elo_before - m.player1_elo_before) / 400.0));
  v_exp2 := 1.0 - v_exp1;
  v_act1 := case when m.player1_wpm > m.player2_wpm then 1.0 when m.player1_wpm = m.player2_wpm then 0.5 else 0.0 end;
  v_act2 := 1.0 - v_act1;

  select ranked_games_played into v_p1_games from public.user_stats where user_id = m.player1_id;
  select ranked_games_played into v_p2_games from public.user_stats where user_id = m.player2_id;
  v_k1 := case when v_p1_games < 5 then 64 else 32 end;
  v_k2 := case when v_p2_games < 5 then 64 else 32 end;

  v_new1 := round(m.player1_elo_before + v_k1 * (v_act1 - v_exp1));
  v_new2 := round(m.player2_elo_before + v_k2 * (v_act2 - v_exp2));

  update public.ranked_matches set status = 'completed', player1_elo_after = v_new1, player2_elo_after = v_new2
    where id = p_match_id;

  update public.user_stats set
    elo = v_new1,
    peak_elo = greatest(peak_elo, v_new1),
    ranked_games_played = ranked_games_played + 1,
    ranked_wins = ranked_wins + (case when v_act1 = 1.0 then 1 else 0 end),
    ranked_losses = ranked_losses + (case when v_act1 = 0.0 then 1 else 0 end),
    ranked_draws = ranked_draws + (case when v_act1 = 0.5 then 1 else 0 end),
    updated_at = now()
  where user_id = m.player1_id;

  update public.user_stats set
    elo = v_new2,
    peak_elo = greatest(peak_elo, v_new2),
    ranked_games_played = ranked_games_played + 1,
    ranked_wins = ranked_wins + (case when v_act2 = 1.0 then 1 else 0 end),
    ranked_losses = ranked_losses + (case when v_act2 = 0.0 then 1 else 0 end),
    ranked_draws = ranked_draws + (case when v_act2 = 0.5 then 1 else 0 end),
    updated_at = now()
  where user_id = m.player2_id;
end;
$$;

-- ============================================================
-- Data repair
-- ============================================================

-- Step 1: purge test_history rows exceeding the new, tighter cap (same
-- purge pattern as schema_039, just re-run against 315 instead of 400 -
-- catches both leftover pre-schema_039 fraud and anything between
-- 315-400 that passed the old cap), subtracting exactly what each
-- purged row is known to have contributed first.
with bad as (
  select * from public.test_history
  where wpm > 315 or raw_wpm > 315 or accuracy > 100 or accuracy < 0 or wpm > raw_wpm
),
bad_agg as (
  select user_id, count(*) as cnt, sum(xp_earned) as xp_sum, sum(time_elapsed) as time_sum,
         sum(accuracy) as acc_sum, sum(wpm) as wpm_sum
  from bad group by user_id
)
update public.user_stats us
set total_tests = greatest(0, us.total_tests - b.cnt),
    total_xp = greatest(0, us.total_xp - b.xp_sum),
    total_time_typed = greatest(0, us.total_time_typed - b.time_sum),
    total_accuracy_sum = greatest(0, us.total_accuracy_sum - b.acc_sum),
    total_wpm_sum = greatest(0, us.total_wpm_sum - b.wpm_sum),
    updated_at = now()
from bad_agg b
where us.user_id = b.user_id;

delete from public.test_history
where wpm > 315 or raw_wpm > 315 or accuracy > 100 or accuracy < 0 or wpm > raw_wpm;

-- Step 2: best_wpm_* recomputed from remaining (now-clean) history for
-- anyone whose stored best_wpm_* still exceeds the cap - covers a
-- best_wpm_* forged directly via the RLS hole with no test_history row
-- behind it at all, which step 1 above can't touch.
with affected as (
  select user_id from public.user_stats
  where best_wpm_time10 > 315 or best_wpm_time30 > 315 or best_wpm_time60 > 315
     or best_wpm_words10 > 315 or best_wpm_words25 > 315 or best_wpm_words50 > 315
),
recomputed as (
  select user_id,
    max(case when mode = 'time' and value = 10 and accuracy >= 40 then wpm end) as b_t10,
    max(case when mode = 'time' and value = 30 and accuracy >= 40 then wpm end) as b_t30,
    max(case when mode = 'time' and value = 60 and accuracy >= 40 then wpm end) as b_t60,
    max(case when mode = 'words' and value = 10 and accuracy >= 40 then wpm end) as b_w10,
    max(case when mode = 'words' and value = 25 and accuracy >= 40 then wpm end) as b_w25,
    max(case when mode = 'words' and value = 50 and accuracy >= 40 then wpm end) as b_w50
  from public.test_history
  where user_id in (select user_id from affected)
  group by user_id
)
update public.user_stats us
set best_wpm_time10 = coalesce(r.b_t10, 0),
    best_wpm_time30 = coalesce(r.b_t30, 0),
    best_wpm_time60 = coalesce(r.b_t60, 0),
    best_wpm_words10 = coalesce(r.b_w10, 0),
    best_wpm_words25 = coalesce(r.b_w25, 0),
    best_wpm_words50 = coalesce(r.b_w50, 0),
    updated_at = now()
from affected a
left join recomputed r on r.user_id = a.user_id
where us.user_id = a.user_id;

-- Step 3: the fix for this exact bug report. total_wpm_sum (and the other
-- three running totals it's summed alongside) is purely test_history-
-- derived — every legitimate contribution to it happens atomically with a
-- test_history insert inside record_test_result — so unlike total_xp
-- (also fed by challenge claims, which don't touch test_history), it's
-- always safe to fully recompute from history rather than only subtract
-- identifiable bad rows. Needed because the reported exploit (a direct
-- UPDATE via the now-dropped RLS hole) can set total_wpm_sum to a value
-- with *no* corresponding test_history row at all, which step 1's
-- subtract-only pass has nothing to find and undo.
with implausible as (
  select user_id from public.user_stats
  where total_tests > 0 and (total_wpm_sum / total_tests) > 315
),
recomputed as (
  select user_id, count(*) as cnt, sum(time_elapsed) as time_sum,
         sum(accuracy) as acc_sum, sum(wpm) as wpm_sum
  from public.test_history
  where user_id in (select user_id from implausible)
  group by user_id
)
update public.user_stats us
set total_tests = coalesce(r.cnt, 0),
    total_time_typed = coalesce(r.time_sum, 0),
    total_accuracy_sum = coalesce(r.acc_sum, 0),
    total_wpm_sum = coalesce(r.wpm_sum, 0),
    updated_at = now()
from implausible i
left join recomputed r on r.user_id = i.user_id
where us.user_id = i.user_id;
