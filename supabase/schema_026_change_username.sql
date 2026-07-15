-- Lets a signed-in user change their own username, at most once every 7
-- days. username_changed_at starts null (the signup-time username doesn't
-- count as a "change" — the cooldown only starts once someone actually
-- uses this), so the first change is always immediately allowed.
alter table public.user_stats add column username_changed_at timestamptz;

create or replace function public.change_username(p_new_username text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_current_username text;
  v_last_changed timestamptz;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  -- Mirrors the column's own check constraint, just to fail with a
  -- friendlier message before hitting a raw constraint-violation error —
  -- the constraint itself is still what's actually authoritative here.
  if p_new_username !~ '^[A-Za-z0-9]{3,20}$' then
    raise exception 'invalid username';
  end if;

  select username, username_changed_at into v_current_username, v_last_changed
  from public.user_stats where user_id = v_user_id for update;

  if lower(v_current_username) = lower(p_new_username) then
    raise exception 'that is already your username';
  end if;

  if v_last_changed is not null and now() - v_last_changed < interval '7 days' then
    raise exception 'username can only be changed once every 7 days';
  end if;

  update public.user_stats
  set username = p_new_username, username_changed_at = now(), updated_at = now()
  where user_id = v_user_id;
end;
$$;

grant execute on function public.change_username to authenticated;
