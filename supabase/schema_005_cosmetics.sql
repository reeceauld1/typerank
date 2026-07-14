-- Cosmetics: earnable avatars + borders (no gameplay effect, purely
-- cosmetic — profile flex only). Run this once in the Supabase SQL Editor.
--
-- Unlock conditions live entirely in the client
-- (src/utils/cosmetics.tsx) as pure functions of already-synced stats, so
-- there's nothing to track server-side except which cosmetic is currently
-- equipped. These catalog tables just constrain equipped_* to a known,
-- valid id via foreign key — they don't duplicate the unlock logic.

create table public.avatar_catalog (id text primary key);
create table public.border_catalog (id text primary key);

insert into public.avatar_catalog (id) values
  ('keyboard'), ('feather'), ('bolt'), ('target'), ('flame'), ('trophy'),
  ('compass'), ('star'), ('shield'), ('crown'), ('rocket'), ('mountain'),
  ('hourglass'), ('medal'), ('diamond'), ('anchor');

insert into public.border_catalog (id) values
  ('none'), ('bronze'), ('silver'), ('gold'), ('diamond'), ('legend');

alter table public.user_stats
  add column equipped_avatar text not null default 'keyboard' references public.avatar_catalog (id),
  add column equipped_border text not null default 'none' references public.border_catalog (id);

-- Sets which avatar/border the caller has equipped. The foreign keys above
-- reject an unknown id; actual unlock-eligibility is checked client-side
-- since these are cosmetic-only (no ranking/competitive impact either way).
create or replace function public.set_equipped_cosmetics(p_avatar_id text, p_border_id text)
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

  update public.user_stats
  set equipped_avatar = p_avatar_id, equipped_border = p_border_id, updated_at = now()
  where user_id = v_user_id;
end;
$$;

grant execute on function public.set_equipped_cosmetics to authenticated;
