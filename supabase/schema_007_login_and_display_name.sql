-- Two independent things, bundled since they landed together:
--
-- 1. Supabase Studio's Auth > Users table shows "-" for Display Name
--    because it reads common metadata keys (display_name, full_name, ...)
--    that signup never set — only `username` was stored. New signups now
--    set display_name/full_name too (see src/context/AuthContext.tsx), but
--    that doesn't retroactively fix existing accounts, hence the backfill
--    below.
--
-- 2. Lets the client resolve a typed username to its email so sign-in can
--    accept either. Supabase's password-grant API only accepts an email
--    (or phone) — there's no username-based sign-in at the API level — so
--    the client always needs a real email up front; this function is what
--    supplies it. It's `security definer` because `auth.users` isn't
--    otherwise readable by anon/authenticated roles, and it's granted to
--    `anon` because sign-in happens before the caller has a session.
--
--    Trade-off worth knowing: this does let anyone with API access resolve
--    a username to its email (not shown in the UI anywhere, but visible to
--    someone inspecting network requests). Acceptable here since nothing
--    else about the account is exposed, but worth keeping in mind.

update auth.users u
set raw_user_meta_data = raw_user_meta_data
  || jsonb_build_object('display_name', us.username, 'full_name', us.username)
from public.user_stats us
where us.user_id = u.id;

create or replace function public.get_email_for_username(p_username text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select au.email
  from public.user_stats us
  join auth.users au on au.id = us.user_id
  where lower(us.username) = lower(p_username)
  limit 1;
$$;

grant execute on function public.get_email_for_username to anon, authenticated;
