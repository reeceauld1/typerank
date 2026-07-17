-- Fixes two real exploits used against production:
--
-- 1. record_test_result / submit_ranked_result trusted whatever wpm,
--    accuracy, and xp_earned the CLIENT sent, with zero server-side
--    validation. Anyone could open devtools and call:
--      supabase.rpc('record_test_result', { p_mode: 'time', p_value: 10,
--        p_wpm: 999999, p_accuracy: 100, p_raw_wpm: 999999, ... })
--    directly, which set best_wpm_time10 (and every other leaderboard
--    column, one call per mode/value) to whatever they liked, and inflated
--    total_xp arbitrarily via p_xp_earned.
--
-- 2. set_equipped_cosmetics / set_equipped_accent_color /
--    set_equipped_name_color only validated that the id existed in the
--    catalog table (a foreign key) — never that the CALLER had actually
--    unlocked it. Unlock eligibility was checked client-side only (see the
--    old comments on these functions), so calling
--    supabase.rpc('set_equipped_cosmetics', { p_avatar_id: 'discord',
--    p_border_id: 'legend' }) directly equipped anything, regardless of
--    actual stats. set_equipped_badge already validated server-side
--    (is_founder/is_supporter/etc.) and wasn't affected.
--
-- The fix: recompute wpm/raw_wpm/xp server-side from the same primitives
-- and formulas the client uses (src/components/TypingTest.tsx,
-- src/utils/xp.ts) instead of trusting the client's own numbers, and
-- mirror every cosmetic's isUnlocked(stats) check (src/utils/cosmetics.tsx,
-- src/utils/accentColors.ts) server-side before allowing it to be equipped.
-- The two hardcoded admin usernames (see isAdminUsername in cosmetics.tsx)
-- still bypass unlock checks here, same as the client already does for them.

-- Level from total_xp, mirroring calculateLevel in src/utils/xp.ts — every
-- level costs a flat 2500 xp, so this has a closed form instead of that
-- function's loop.
create or replace function public.user_level(p_total_xp integer)
returns integer
language sql
immutable
as $$
  select 1 + floor(greatest(0, p_total_xp) / 2500.0)::integer;
$$;

-- Records a finished test: appends to history and atomically updates the
-- running totals + per-mode best WPM. wpm, raw_wpm, and xp_earned are all
-- recomputed here from p_correct_chars/p_incorrect_chars/p_time_elapsed
-- (mirroring TypingTest.tsx's wpm/rawWpm formulas and xp.ts's
-- calculateXP/checkChallengeMilestone) rather than trusted from the
-- client — see the file header for why. accuracy can't be recomputed the
-- same way (it's derived from raw keystrokes, which aren't sent here), so
-- it's only bounds-checked, not recalculated.
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

  -- Well beyond any legitimate human result (competitive records top out
  -- around 200-250 wpm even on short bursts) — just far enough above real
  -- scores that no genuine run is ever rejected.
  if v_wpm > 400 or v_raw_wpm > 400 then
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

  -- No upsert needed here: the user_stats row (with its required username)
  -- is always created at signup by the handle_new_user trigger below.
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

-- Same bounds as record_test_result above — no correct_chars/incorrect_chars
-- are sent here, so wpm/raw_wpm can't be recomputed from primitives, only
-- bounds-checked. Elo impact was already capped by the K-factor formula
-- below regardless (an absurd wpm just forces a "win", not an arbitrary
-- rating), but there's no reason to let implausible values through either.
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

  if p_wpm is null or p_wpm < 0 or p_wpm > 400
    or p_raw_wpm is null or p_raw_wpm < 0 or p_raw_wpm > 400
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
end;
$$;

grant execute on function public.submit_ranked_result to authenticated;

-- Sets which avatar/border the caller has equipped. Unlock eligibility
-- (mirroring AVATAR_CATALOG/BORDER_CATALOG's isUnlocked in
-- src/utils/cosmetics.tsx) is now checked here — previously the foreign
-- keys on equipped_avatar/equipped_border were the only guard, which
-- rejected an unknown id but not an id the caller hadn't earned.
create or replace function public.set_equipped_cosmetics(p_avatar_id text, p_border_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  s public.user_stats;
  v_admin boolean;
  v_level integer;
  v_avg_accuracy numeric;
  v_best_wpm integer;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  select * into s from public.user_stats where user_id = v_user_id;
  v_admin := lower(s.username) in ('yvern', 'lol');
  v_level := public.user_level(s.total_xp);
  v_avg_accuracy := case when s.total_tests > 0 then s.total_accuracy_sum / s.total_tests else 0 end;
  v_best_wpm := greatest(s.best_wpm_time10, s.best_wpm_time30, s.best_wpm_time60, s.best_wpm_words10, s.best_wpm_words25, s.best_wpm_words50);

  if not v_admin and not coalesce(case p_avatar_id
    when 'keyboard' then true
    when 'feather' then v_level >= 5
    when 'trophy' then v_level >= 10
    when 'crown' then v_level >= 25
    when 'hourglass' then v_level >= 50
    when 'compass' then s.best_wpm_time10 > 0 and s.best_wpm_time30 > 0 and s.best_wpm_time60 > 0
      and s.best_wpm_words10 > 0 and s.best_wpm_words25 > 0 and s.best_wpm_words50 > 0
    when 'flame' then s.total_tests >= 50
    when 'star' then s.total_tests >= 100
    when 'mountain' then s.total_tests >= 250
    when 'anchor' then s.total_tests >= 500
    when 'bolt' then v_best_wpm >= 60
    when 'rocket' then v_best_wpm >= 100
    when 'diamond' then v_best_wpm >= 120
    when 'target' then s.total_tests >= 20 and v_avg_accuracy >= 95
    when 'shield' then s.total_tests >= 50 and v_avg_accuracy >= 97
    when 'medal' then s.total_tests >= 100 and v_avg_accuracy >= 99
    when 'discord' then s.discord_avatar_url is not null
    else false
  end, false) then
    raise exception 'avatar not unlocked';
  end if;

  if not v_admin and not coalesce(case p_border_id
    when 'none' then true
    when 'bronze' then v_level >= 5
    when 'silver' then v_level >= 15
    when 'gold' then v_level >= 30
    when 'platinum' then v_level >= 40
    when 'diamond' then v_level >= 50
    when 'amethyst' then v_level >= 75
    when 'legend' then v_level >= 100
    else false
  end, false) then
    raise exception 'border not unlocked';
  end if;

  update public.user_stats
  set equipped_avatar = p_avatar_id, equipped_border = p_border_id, updated_at = now()
  where user_id = v_user_id;
end;
$$;

-- Mirrors ACCENT_COLOR_CATALOG's isUnlocked (src/utils/accentColors.ts),
-- gated on total_time_typed — same missing-validation issue as
-- set_equipped_cosmetics above.
create or replace function public.set_equipped_accent_color(p_color_id text, p_custom_hex text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  s public.user_stats;
  v_admin boolean;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  if p_color_id = 'custom' and (p_custom_hex is null or p_custom_hex !~ '^#[0-9a-fA-F]{6}$') then
    raise exception 'invalid custom color';
  end if;

  select * into s from public.user_stats where user_id = v_user_id;
  v_admin := lower(s.username) in ('yvern', 'lol');

  if not v_admin and not coalesce(case p_color_id
    when 'blue' then true
    when 'monochrome' then s.total_time_typed >= 900
    when 'green' then s.total_time_typed >= 1800
    when 'purple' then s.total_time_typed >= 3600
    when 'orange' then s.total_time_typed >= 7200
    when 'magenta' then s.total_time_typed >= 14400
    when 'gold' then s.total_time_typed >= 28800
    when 'custom' then s.total_time_typed >= 57600
    else false
  end, false) then
    raise exception 'accent color not unlocked';
  end if;

  update public.user_stats
  set equipped_accent_color = p_color_id,
      custom_accent_hex = case when p_color_id = 'custom' then p_custom_hex else custom_accent_hex end,
      updated_at = now()
  where user_id = v_user_id;
end;
$$;

grant execute on function public.set_equipped_accent_color to authenticated;

-- Mirrors NAME_COLOR_CATALOG's isUnlocked/reachedRank (src/utils/
-- cosmetics.tsx, src/utils/rank.ts) — gated on peak_elo once placements
-- (5 ranked games) are done. Same missing-validation issue as the two
-- functions above.
create or replace function public.set_equipped_name_color(p_color_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  s public.user_stats;
  v_admin boolean;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  select * into s from public.user_stats where user_id = v_user_id;
  v_admin := lower(s.username) in ('yvern', 'lol');

  if not v_admin and p_color_id <> 'default' and not (
    s.ranked_games_played >= 5 and s.peak_elo >= case p_color_id
      when 'bronze' then 0
      when 'silver' then 900
      when 'gold' then 1050
      when 'platinum' then 1200
      when 'diamond' then 1350
      when 'amethyst' then 1500
      when 'legend' then 1700
      else 999999999
    end
  ) then
    raise exception 'name color not unlocked';
  end if;

  update public.user_stats
  set equipped_name_color = p_color_id, updated_at = now()
  where user_id = v_user_id;
end;
$$;

grant execute on function public.set_equipped_name_color to authenticated;

-- ============================================================
-- Data repair: undo the damage the exploit already did in production.
-- ============================================================

-- Step 1: subtract exactly what the fraudulent rows contributed to each
-- affected user's running totals (not a blanket recompute-from-history,
-- since total_xp is also fed by daily/weekly/hourly challenge claims that
-- never touch test_history — recomputing it from test_history alone would
-- wipe out legitimately-earned challenge xp).
with bad as (
  select * from public.test_history
  where wpm > 400 or raw_wpm > 400 or accuracy > 100 or accuracy < 0 or wpm > raw_wpm
),
bad_agg as (
  select user_id, count(*) as cnt, sum(xp_earned) as xp_sum, sum(time_elapsed) as time_sum,
         sum(accuracy) as acc_sum, sum(wpm) as wpm_sum
  from bad group by user_id
)
update public.user_stats us
set total_tests = us.total_tests - b.cnt,
    total_xp = greatest(0, us.total_xp - b.xp_sum),
    total_time_typed = greatest(0, us.total_time_typed - b.time_sum),
    total_accuracy_sum = greatest(0, us.total_accuracy_sum - b.acc_sum),
    total_wpm_sum = greatest(0, us.total_wpm_sum - b.wpm_sum),
    updated_at = now()
from bad_agg b
where us.user_id = b.user_id;

-- Step 2: recompute best_wpm_* for just the affected users, from whatever
-- legitimate history they have left.
with affected as (
  select distinct user_id from public.test_history
  where wpm > 400 or raw_wpm > 400 or accuracy > 100 or accuracy < 0 or wpm > raw_wpm
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
    and not (wpm > 400 or raw_wpm > 400 or accuracy > 100 or accuracy < 0 or wpm > raw_wpm)
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
from recomputed r
where us.user_id = r.user_id;

-- Step 2b: affected users with NO legitimate rows left at all (every row
-- they ever submitted was fraudulent) aren't in `recomputed` above, so they
-- need explicit zeroing.
update public.user_stats
set best_wpm_time10 = 0, best_wpm_time30 = 0, best_wpm_time60 = 0,
    best_wpm_words10 = 0, best_wpm_words25 = 0, best_wpm_words50 = 0,
    updated_at = now()
where user_id in (
  select distinct user_id from public.test_history
  where wpm > 400 or raw_wpm > 400 or accuracy > 100 or accuracy < 0 or wpm > raw_wpm
)
and user_id not in (
  select distinct user_id from public.test_history
  where not (wpm > 400 or raw_wpm > 400 or accuracy > 100 or accuracy < 0 or wpm > raw_wpm)
);

-- Step 3: only now is it safe to delete the fraudulent rows (the two steps
-- above already read what they needed from them).
delete from public.test_history
where wpm > 400 or raw_wpm > 400 or accuracy > 100 or accuracy < 0 or wpm > raw_wpm;

-- Step 4: reset any cosmetic currently equipped without actually qualifying
-- for it (the two hardcoded admin accounts are exempt, same as the
-- functions above) back to that category's default.
with s as (
  select
    user_id,
    lower(username) in ('yvern', 'lol') as is_admin,
    public.user_level(total_xp) as level,
    case when total_tests > 0 then total_accuracy_sum / total_tests else 0 end as avg_accuracy,
    greatest(best_wpm_time10, best_wpm_time30, best_wpm_time60, best_wpm_words10, best_wpm_words25, best_wpm_words50) as best_wpm
  from public.user_stats
)
update public.user_stats us
set equipped_avatar = case when not s.is_admin and not coalesce(case us.equipped_avatar
      when 'keyboard' then true
      when 'feather' then s.level >= 5
      when 'trophy' then s.level >= 10
      when 'crown' then s.level >= 25
      when 'hourglass' then s.level >= 50
      when 'compass' then us.best_wpm_time10 > 0 and us.best_wpm_time30 > 0 and us.best_wpm_time60 > 0
        and us.best_wpm_words10 > 0 and us.best_wpm_words25 > 0 and us.best_wpm_words50 > 0
      when 'flame' then us.total_tests >= 50
      when 'star' then us.total_tests >= 100
      when 'mountain' then us.total_tests >= 250
      when 'anchor' then us.total_tests >= 500
      when 'bolt' then s.best_wpm >= 60
      when 'rocket' then s.best_wpm >= 100
      when 'diamond' then s.best_wpm >= 120
      when 'target' then us.total_tests >= 20 and s.avg_accuracy >= 95
      when 'shield' then us.total_tests >= 50 and s.avg_accuracy >= 97
      when 'medal' then us.total_tests >= 100 and s.avg_accuracy >= 99
      when 'discord' then us.discord_avatar_url is not null
      else false
    end, false) then 'keyboard' else us.equipped_avatar end,
  equipped_border = case when not s.is_admin and not coalesce(case us.equipped_border
      when 'none' then true
      when 'bronze' then s.level >= 5
      when 'silver' then s.level >= 15
      when 'gold' then s.level >= 30
      when 'platinum' then s.level >= 40
      when 'diamond' then s.level >= 50
      when 'amethyst' then s.level >= 75
      when 'legend' then s.level >= 100
      else false
    end, false) then 'none' else us.equipped_border end,
  equipped_accent_color = case when not s.is_admin and not coalesce(case us.equipped_accent_color
      when 'blue' then true
      when 'monochrome' then us.total_time_typed >= 900
      when 'green' then us.total_time_typed >= 1800
      when 'purple' then us.total_time_typed >= 3600
      when 'orange' then us.total_time_typed >= 7200
      when 'magenta' then us.total_time_typed >= 14400
      when 'gold' then us.total_time_typed >= 28800
      when 'custom' then us.total_time_typed >= 57600
      else false
    end, false) then 'blue' else us.equipped_accent_color end,
  equipped_name_color = case when not s.is_admin and us.equipped_name_color <> 'default' and not (
      us.ranked_games_played >= 5 and us.peak_elo >= case us.equipped_name_color
        when 'bronze' then 0 when 'silver' then 900 when 'gold' then 1050
        when 'platinum' then 1200 when 'diamond' then 1350 when 'amethyst' then 1500
        when 'legend' then 1700 else 999999999 end
    ) then 'default' else us.equipped_name_color end,
  updated_at = now()
from s
where us.user_id = s.user_id;
