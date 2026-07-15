-- Duels gain a time mode (to match solo tests) plus custom word counts and
-- custom durations. `word_count` is renamed to `value` since it now holds
-- either a word count or a duration in seconds depending on `mode`.
--
-- XP itself isn't awarded here — duel results already flow through
-- submit_duel_result/submit_guest_duel_result, and the client separately
-- calls the existing record_test_result RPC (via addTestResult) for
-- authenticated participants once a result is submitted, exactly like a
-- solo test. Custom (non-preset) values are submitted with value=0 and a
-- 0.5x xp multiplier — the same "unranked practice" sentinel already used
-- for infinite-mode solo tests — so they earn half XP and never touch the
-- best_wpm_* leaderboard columns, while standard-value duels (10/25/50
-- words, 10/30/60s) earn full XP and rank normally.
alter table public.duels rename column word_count to value;
alter table public.duels add column mode text not null default 'words' check (mode in ('words', 'time'));

drop function if exists public.create_guest_duel(int, text, text);

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
