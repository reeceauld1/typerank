-- Phase 1 of 1v1 duels: a shared word list, a link to share, async results
-- (no live opponent progress yet — that's a later phase). No friend-gating
-- yet either — anyone with the link can join as the opponent.
create table public.duels (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references auth.users (id) on delete cascade,
  opponent_id uuid references auth.users (id) on delete cascade,
  word_count int not null,
  word_list text not null,
  creator_wpm int,
  creator_accuracy int,
  creator_raw_wpm int,
  creator_time_elapsed numeric,
  opponent_wpm int,
  opponent_accuracy int,
  opponent_raw_wpm int,
  opponent_time_elapsed numeric,
  created_at timestamptz not null default now()
);

alter table public.duels enable row level security;

create policy "insert own duel" on public.duels
  for insert to authenticated with check (creator_id = auth.uid());

-- Readable by any signed-in user — needed so a second user can look up an
-- unclaimed duel by its link before they've joined it. Same reasoning as
-- "select any stats": no sensitive data, just usernames/results, and the
-- unguessable UUID in the link is the actual access control.
create policy "select duels" on public.duels
  for select to authenticated using (true);

-- Live-updates the duel page (opponent joined / opponent finished) without
-- requiring a manual refresh.
alter publication supabase_realtime add table public.duels;

-- Joining and submitting results both go through these security-definer
-- RPCs rather than direct client updates, so one player can never claim an
-- already-taken opponent slot or overwrite the other player's result.
create or replace function public.join_duel(p_duel_id uuid)
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

  if v_creator_id is null then
    raise exception 'duel not found';
  end if;
  if v_creator_id = v_user_id then
    raise exception 'cannot join your own duel';
  end if;
  if v_opponent_id is not null and v_opponent_id != v_user_id then
    raise exception 'duel already has an opponent';
  end if;

  update public.duels set opponent_id = v_user_id where id = p_duel_id;
end;
$$;

grant execute on function public.join_duel to authenticated;

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

  if v_creator_id is null then
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

grant execute on function public.submit_duel_result to authenticated;
