-- Lets a duel creator withdraw a friend invite they sent (e.g. they
-- navigate away before the recipient responds) — the recipient's pending
-- invite (nav badge + /duel invite list) then clears via the existing
-- status='pending' filters and Realtime subscriptions, no extra plumbing
-- needed on that side.
alter table public.duels drop constraint duels_status_check;
alter table public.duels add constraint duels_status_check
  check (status in ('open', 'pending', 'accepted', 'declined', 'cancelled'));

create or replace function public.cancel_duel_invite(p_duel_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_creator_id uuid;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  select creator_id into v_creator_id
  from public.duels where id = p_duel_id for update;

  if v_creator_id is null or v_creator_id != v_user_id then
    raise exception 'not your duel';
  end if;

  update public.duels set status = 'cancelled' where id = p_duel_id and status = 'pending';
end;
$$;

grant execute on function public.cancel_duel_invite to authenticated;
