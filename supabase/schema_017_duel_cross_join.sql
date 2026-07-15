-- Lets either direction work: a guest joining an account-holder's duel,
-- and an account-holder joining a guest's duel (the latter already worked
-- client-side, but join_guest_duel rejected it server-side). Also fixes
-- two latent bugs surfaced by creator_id now being nullable:
--   1. join_duel/submit_duel_result treated a null creator_id (a guest
--      duel) as "duel not found" — checking FOUND instead of the column
--      value fixes that.
--   2. join_duel only checked opponent_id, not opponent_name, so an
--      account-holder could silently steal an opponent slot a guest had
--      already claimed. Now checks both.
create or replace function public.join_duel(p_duel_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_creator_id uuid;
  v_opponent_id uuid;
  v_opponent_name text;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  select creator_id, opponent_id, opponent_name into v_creator_id, v_opponent_id, v_opponent_name
  from public.duels where id = p_duel_id for update;

  if not found then
    raise exception 'duel not found';
  end if;
  if v_creator_id = v_user_id then
    raise exception 'cannot join your own duel';
  end if;
  if v_opponent_id is not null then
    if v_opponent_id != v_user_id then
      raise exception 'duel already has an opponent';
    end if;
  elsif v_opponent_name is not null then
    raise exception 'duel already has an opponent';
  end if;

  update public.duels set opponent_id = v_user_id, status = 'accepted' where id = p_duel_id;
end;
$$;

create or replace function public.join_guest_duel(p_duel_id uuid, p_name text)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_opponent_id uuid;
  v_opponent_name text;
  v_token uuid := gen_random_uuid();
begin
  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'name required';
  end if;

  select opponent_id, opponent_name into v_opponent_id, v_opponent_name
  from public.duels where id = p_duel_id for update;

  if not found then
    raise exception 'duel not found';
  end if;
  if v_opponent_id is not null or v_opponent_name is not null then
    raise exception 'duel already has an opponent';
  end if;

  update public.duels
  set opponent_name = trim(p_name), opponent_token = v_token, status = 'accepted'
  where id = p_duel_id;

  return v_token;
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
