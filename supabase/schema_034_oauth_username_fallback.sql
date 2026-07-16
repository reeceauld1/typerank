-- Discord (and any future OAuth provider) sign-ins never set our own
-- 'username' metadata key the way email/password signUp does, and the
-- provider-native handle they do supply (Discord's user_name/full_name) can
-- contain dots, underscores, or unicode that fails our
-- ^[A-Za-z0-9]{3,20}$ rule. Previously that meant handle_new_user's insert
-- hit the check constraint and rolled back the entire signup with an opaque
-- "Database error saving new user". Instead, synthesize a placeholder
-- username from whatever name the provider gave us (or 'user' if there's
-- nothing usable), padded with a random suffix for uniqueness. The user can
-- rename it immediately via the existing change_username flow — the 7-day
-- cooldown only starts on their first real rename, same as an email signup.
--
-- Malformed-but-present usernames (shouldn't happen — the client validates
-- before calling signUp) still fall through to the insert and roll back as
-- before; only a missing key is treated as "this is an OAuth signup".
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing_count integer;
  v_username text;
  v_base text;
  v_suffix text;
  v_attempt integer := 0;
begin
  select count(*) into v_existing_count from public.user_stats;

  v_username := new.raw_user_meta_data ->> 'username';

  if v_username is null then
    v_base := regexp_replace(
      coalesce(new.raw_user_meta_data ->> 'user_name', new.raw_user_meta_data ->> 'full_name', ''),
      '[^A-Za-z0-9]', '', 'g'
    );
    if length(v_base) < 3 then
      v_base := 'user';
    end if;
    v_base := left(v_base, 14);

    loop
      v_suffix := lpad(floor(random() * 100000)::text, 5, '0');
      v_username := left(v_base, 20 - length(v_suffix)) || v_suffix;
      v_attempt := v_attempt + 1;
      exit when v_attempt > 20 or not exists (
        select 1 from public.user_stats where lower(username) = lower(v_username)
      );
    end loop;
  end if;

  insert into public.user_stats (user_id, username, is_founder)
  values (new.id, v_username, v_existing_count < 25);
  return new;
end;
$$;
