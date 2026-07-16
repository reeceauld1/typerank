-- Lets a linked Discord identity become the user's avatar. Discord's
-- profile picture isn't a static catalog icon like every other avatar — it's
-- per-user data — so this stores the actual CDN URL and adds 'discord' as a
-- legitimate equipped_avatar id (Avatar.tsx special-cases that id to render
-- an <img> from discord_avatar_url instead of an icon component).
insert into public.avatar_catalog (id) values ('discord')
  on conflict (id) do nothing;

alter table public.user_stats
  add column if not exists discord_avatar_url text;

-- Fires whenever a Discord identity is attached to a user — both a fresh
-- "sign in with Discord" (auth.users + auth.identities are inserted in the
-- same transaction, in that order, so user_stats already exists by the time
-- this runs) and linkIdentity() on an existing account. Only auto-equips on
-- top of the untouched starting avatar ('keyboard') — once someone's picked
-- something else, linking Discord shouldn't silently override their choice.
-- Supabase's Discord provider always populates identity_data->>'avatar_url'
-- with the resolved CDN URL; if that's ever missing this is a no-op.
create or replace function public.sync_discord_avatar()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_avatar_url text;
begin
  if new.provider <> 'discord' then
    return new;
  end if;

  v_avatar_url := new.identity_data ->> 'avatar_url';
  if v_avatar_url is null then
    return new;
  end if;

  update public.user_stats
  set discord_avatar_url = v_avatar_url,
      equipped_avatar = case when equipped_avatar = 'keyboard' then 'discord' else equipped_avatar end,
      updated_at = now()
  where user_id = new.user_id;

  return new;
end;
$$;

drop trigger if exists on_auth_identity_created on auth.identities;
create trigger on_auth_identity_created
  after insert on auth.identities
  for each row execute function public.sync_discord_avatar();

-- Mirror on unlink: clears the stored URL and, if 'discord' was still
-- equipped, reverts to the default so a stale avatar id doesn't linger
-- with no picture behind it.
create or replace function public.clear_discord_avatar()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.provider <> 'discord' then
    return old;
  end if;

  update public.user_stats
  set discord_avatar_url = null,
      equipped_avatar = case when equipped_avatar = 'discord' then 'keyboard' else equipped_avatar end,
      updated_at = now()
  where user_id = old.user_id;

  return old;
end;
$$;

drop trigger if exists on_auth_identity_deleted on auth.identities;
create trigger on_auth_identity_deleted
  after delete on auth.identities
  for each row execute function public.clear_discord_avatar();
