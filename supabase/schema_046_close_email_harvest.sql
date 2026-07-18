-- Bug report: "get_email_for_username may leak emails if it's callable
-- without login for any username - someone can harvest every user's
-- email." Confirmed: it was `security definer`, granted to `anon`, and
-- returned the real email for any username with zero rate limiting or
-- authentication - since usernames are public (every profile/leaderboard
-- shows one), anyone could enumerate every account's real email by
-- calling it once per known username. Its only legitimate purpose was
-- resolving a username to an email for Supabase Auth's password-grant
-- API (which only accepts email, not username) during sign-in.
--
-- Fix: require the caller to already know the account's password,
-- verified here against auth.users' own bcrypt hash - only returns the
-- email once that's proven, so it's no longer useful for harvesting
-- (whoever already has valid credentials for an account has no need to
-- go fishing for its email). Wrong username and wrong password both
-- return null, same as before, so this still can't be used to check
-- whether a username exists either.
--
-- The old function's *other* caller (forgot-password) had the identical
-- exposure with no password to gate on at all, so that flow now requires
-- an actual email instead of resolving a username server-side - see
-- src/context/AuthContext.tsx / AuthForm.tsx. That's a one-line UX change
-- (type your email, not your username, to reset a forgotten password -
-- standard practice, since that's literally where the reset link goes)
-- rather than the much larger lift of moving the whole reset trigger
-- server-side to avoid it.
create extension if not exists pgcrypto with schema extensions;

drop function if exists public.get_email_for_username(text);

create or replace function public.resolve_login_email(p_username text, p_password text)
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
    and au.encrypted_password = extensions.crypt(p_password, au.encrypted_password)
  limit 1;
$$;

grant execute on function public.resolve_login_email to anon, authenticated;
