-- Lets the invited player withdraw a still-pending friend invite once
-- they've noticed (via presence, see DuelMatch.tsx) that the sender has
-- disconnected — mirrors cancel_duel_invite (schema_016), but with the
-- caller/role flipped: that one only lets the creator cancel their own
-- invite, this only lets the opponent it was sent to expire it. Sets the
-- same 'cancelled' status cancel_duel_invite uses (not 'declined' — the
-- opponent didn't actively decline, the sender just vanished, and
-- 'declined' would show the creator a misleading "they declined" message).
create or replace function public.expire_duel_invite(p_duel_id uuid)
returns void
language plpgsql
security definer
set search_path = public
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

  update public.duels set status = 'cancelled' where id = p_duel_id and status = 'pending';
end;
$$;

grant execute on function public.expire_duel_invite to authenticated;
