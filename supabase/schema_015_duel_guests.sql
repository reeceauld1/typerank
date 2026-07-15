-- Guest duels: no account needed. Identity is proven with a random token
-- issued when you create or join (stored client-side in sessionStorage,
-- scoped to that duel), instead of auth.uid() — there's no account to
-- check against for a guest. creator_id/opponent_id stay null for these
-- rows; creator_name/opponent_name carry the display name instead.
alter table public.duels alter column creator_id drop not null;
alter table public.duels add column creator_name text;
alter table public.duels add column opponent_name text;
alter table public.duels add column creator_token uuid;
alter table public.duels add column opponent_token uuid;

-- Guests read duel rows too (anon role), not just signed-in users.
drop policy "select duels" on public.duels;
create policy "select duels" on public.duels
  for select to anon, authenticated using (true);

create or replace function public.create_guest_duel(p_word_count int, p_word_list text, p_creator_name text)
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

  insert into public.duels (id, word_count, word_list, creator_name, creator_token, status)
  values (v_id, p_word_count, p_word_list, trim(p_creator_name), v_token, 'open');

  return query select v_id, v_token;
end;
$$;

grant execute on function public.create_guest_duel to anon, authenticated;

create or replace function public.join_guest_duel(p_duel_id uuid, p_name text)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_opponent_name text;
  v_creator_id uuid;
  v_token uuid := gen_random_uuid();
begin
  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'name required';
  end if;

  select opponent_name, creator_id into v_opponent_name, v_creator_id
  from public.duels where id = p_duel_id for update;

  if v_creator_id is not null then
    raise exception 'not a guest duel';
  end if;
  if v_opponent_name is not null then
    raise exception 'duel already has an opponent';
  end if;

  update public.duels
  set opponent_name = trim(p_name), opponent_token = v_token, status = 'accepted'
  where id = p_duel_id;

  return v_token;
end;
$$;

grant execute on function public.join_guest_duel to anon, authenticated;

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

grant execute on function public.submit_guest_duel_result to anon, authenticated;
