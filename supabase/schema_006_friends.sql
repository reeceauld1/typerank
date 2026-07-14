-- Friends: send/accept/decline requests and unfriend. Run this once in the
-- Supabase SQL Editor if you already ran the earlier schema files.
--
-- One row per pair, keyed by (requester, addressee) so a request has a
-- natural direction. Accepting flips status in place rather than inserting
-- a second row, which keeps "are we friends" a single-row lookup in either
-- direction.
create table public.friendships (
  requester_id uuid not null references auth.users (id) on delete cascade,
  addressee_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  primary key (requester_id, addressee_id),
  constraint friendships_no_self check (requester_id <> addressee_id)
);

create index friendships_addressee_id_idx on public.friendships (addressee_id);

alter table public.friendships enable row level security;

create policy "select own friendships" on public.friendships
  for select using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- Profiles need to be viewable by username search and by friends before a
-- request is even sent, so stats (no PII beyond a username — no email,
-- nothing account-sensitive) become readable by any signed-in user. This
-- policy is additive: the original "select own stats" policy still applies,
-- select policies are OR'd together.
create policy "select any stats" on public.user_stats
  for select to authenticated using (true);

-- Looks the target up by username and either creates a pending request or,
-- if they'd already requested the caller, accepts it instead of leaving two
-- one-directional rows around. Returns 'pending' or 'accepted'.
create or replace function public.send_friend_request(p_username text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_target_id uuid;
  v_existing record;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  select user_id into v_target_id from public.user_stats where lower(username) = lower(p_username);
  if v_target_id is null then
    raise exception 'user not found';
  end if;
  if v_target_id = v_user_id then
    raise exception 'cannot friend yourself';
  end if;

  select * into v_existing from public.friendships
    where (requester_id = v_user_id and addressee_id = v_target_id)
       or (requester_id = v_target_id and addressee_id = v_user_id);

  if v_existing.status = 'accepted' then
    raise exception 'already friends';
  end if;

  if v_existing.requester_id = v_user_id then
    raise exception 'request already sent';
  end if;

  if v_existing.requester_id = v_target_id then
    update public.friendships set status = 'accepted', responded_at = now()
      where requester_id = v_target_id and addressee_id = v_user_id;
    return 'accepted';
  end if;

  insert into public.friendships (requester_id, addressee_id) values (v_user_id, v_target_id);
  return 'pending';
end;
$$;

grant execute on function public.send_friend_request to authenticated;

-- Accepts or declines a pending request addressed to the caller. Declining
-- just deletes the row, same as never having sent it.
create or replace function public.respond_friend_request(p_requester_id uuid, p_accept boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  if p_accept then
    update public.friendships set status = 'accepted', responded_at = now()
      where requester_id = p_requester_id and addressee_id = v_user_id and status = 'pending';
    if not found then
      raise exception 'no pending request from that user';
    end if;
  else
    delete from public.friendships
      where requester_id = p_requester_id and addressee_id = v_user_id and status = 'pending';
  end if;
end;
$$;

grant execute on function public.respond_friend_request to authenticated;

-- Removes a friendship in either direction and either state — covers
-- unfriending an accepted friend and cancelling a request the caller sent.
create or replace function public.remove_friend(p_other_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  delete from public.friendships
    where (requester_id = v_user_id and addressee_id = p_other_user_id)
       or (requester_id = p_other_user_id and addressee_id = v_user_id);
end;
$$;

grant execute on function public.remove_friend to authenticated;
