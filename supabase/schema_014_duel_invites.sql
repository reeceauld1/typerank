-- Phase 2 of 1v1 duels: friend-targeted invites with an explicit
-- accept/decline step, distinct from the phase-1 "open" link-share flow
-- (anyone with the link auto-joins there — a friend invite needs the
-- invitee to actually respond).
alter table public.duels
  add column status text not null default 'open' check (status in ('open', 'pending', 'accepted', 'declined'));

-- Backfill: any duel that already has an opponent (joined via the phase-1
-- link flow, before this column existed) counts as accepted.
update public.duels set status = 'accepted' where opponent_id is not null;

-- join_duel (phase 1, open link) now also marks the duel accepted, so
-- DuelMatch's rendering can key off `status` uniformly regardless of how a
-- duel became active.
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

  update public.duels set opponent_id = v_user_id, status = 'accepted' where id = p_duel_id;
end;
$$;

create or replace function public.accept_duel_invite(p_duel_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_opponent_id uuid;
  v_status text;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  select opponent_id, status into v_opponent_id, v_status
  from public.duels where id = p_duel_id for update;

  if v_opponent_id is null then
    raise exception 'duel not found';
  end if;
  if v_opponent_id != v_user_id then
    raise exception 'not your invite';
  end if;
  if v_status != 'pending' then
    raise exception 'invite is no longer pending';
  end if;

  update public.duels set status = 'accepted' where id = p_duel_id;
end;
$$;

grant execute on function public.accept_duel_invite to authenticated;

create or replace function public.decline_duel_invite(p_duel_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_opponent_id uuid;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  select opponent_id into v_opponent_id
  from public.duels where id = p_duel_id for update;

  if v_opponent_id is null or v_opponent_id != v_user_id then
    raise exception 'not your invite';
  end if;

  update public.duels set status = 'declined' where id = p_duel_id and status = 'pending';
end;
$$;

grant execute on function public.decline_duel_invite to authenticated;
