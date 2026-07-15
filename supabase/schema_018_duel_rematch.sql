-- Rematch: once both results are in, either player can request a rematch.
-- Once BOTH have requested it, a fresh duel (same pairing, same word
-- count, a new word list) is created automatically and rematch_duel_id is
-- set on the old row — both clients pick that up via the same Realtime
-- subscription already watching the duel and navigate there. Works for
-- guest participants too via a token-based twin RPC, same pattern as
-- join_duel/join_guest_duel.
alter table public.duels add column creator_rematch boolean not null default false;
alter table public.duels add column opponent_rematch boolean not null default false;
alter table public.duels add column rematch_duel_id uuid references public.duels (id);

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
  v_word_count int;
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

  select creator_id, opponent_id, creator_name, opponent_name, word_count, creator_wpm, opponent_wpm,
         creator_rematch, opponent_rematch, rematch_duel_id
  into v_creator_id, v_opponent_id, v_creator_name, v_opponent_name, v_word_count, v_creator_wpm, v_opponent_wpm,
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
      (creator_id, opponent_id, creator_name, opponent_name, creator_token, opponent_token, word_count, word_list, status)
    values
      (v_creator_id, v_opponent_id, v_creator_name, v_opponent_name, v_new_creator_token, v_new_opponent_token, v_word_count, p_word_list, 'accepted')
    returning id into v_new_id;

    update public.duels set rematch_duel_id = v_new_id where id = p_duel_id;
    v_rematch_duel_id := v_new_id;
  end if;

  return v_rematch_duel_id;
end;
$$;

grant execute on function public.request_rematch to authenticated;

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
  v_word_count int;
  v_creator_wpm int;
  v_opponent_wpm int;
  v_creator_rematch boolean;
  v_opponent_rematch boolean;
  v_rematch_duel_id uuid;
  v_new_id uuid;
  v_new_creator_token uuid;
  v_new_opponent_token uuid;
begin
  select creator_id, opponent_id, creator_name, opponent_name, creator_token, opponent_token, word_count,
         creator_wpm, opponent_wpm, creator_rematch, opponent_rematch, rematch_duel_id
  into v_creator_id, v_opponent_id, v_creator_name, v_opponent_name, v_creator_token, v_opponent_token, v_word_count,
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
      (creator_id, opponent_id, creator_name, opponent_name, creator_token, opponent_token, word_count, word_list, status)
    values
      (v_creator_id, v_opponent_id, v_creator_name, v_opponent_name, v_new_creator_token, v_new_opponent_token, v_word_count, p_word_list, 'accepted')
    returning id into v_new_id;

    update public.duels set rematch_duel_id = v_new_id where id = p_duel_id;
    v_rematch_duel_id := v_new_id;
  end if;

  return v_rematch_duel_id;
end;
$$;

grant execute on function public.request_guest_rematch to anon, authenticated;
