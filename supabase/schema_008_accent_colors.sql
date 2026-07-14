-- Accent color customization: like avatars/borders, unlock conditions live
-- entirely in the client (src/utils/accentColors.ts) as pure functions of
-- already-synced stats — here, total time typed. Run this once in the
-- Supabase SQL Editor.

create table public.accent_color_catalog (id text primary key);

insert into public.accent_color_catalog (id) values
  ('blue'), ('teal'), ('green'), ('purple'), ('orange'), ('magenta'), ('gold'), ('custom');

alter table public.user_stats
  add column equipped_accent_color text not null default 'blue' references public.accent_color_catalog (id),
  add column custom_accent_hex text check (custom_accent_hex is null or custom_accent_hex ~ '^#[0-9a-fA-F]{6}$');

-- Sets the caller's equipped accent color. p_custom_hex is only stored (and
-- required) when p_color_id = 'custom' — the foreign key above rejects an
-- unknown color id, same pattern as set_equipped_cosmetics. Actual unlock
-- eligibility (time typed) is checked client-side, same rationale as the
-- avatar/border catalogs: cosmetic-only, no ranking impact either way.
create or replace function public.set_equipped_accent_color(p_color_id text, p_custom_hex text default null)
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

  if p_color_id = 'custom' and (p_custom_hex is null or p_custom_hex !~ '^#[0-9a-fA-F]{6}$') then
    raise exception 'invalid custom color';
  end if;

  update public.user_stats
  set equipped_accent_color = p_color_id,
      custom_accent_hex = case when p_color_id = 'custom' then p_custom_hex else custom_accent_hex end,
      updated_at = now()
  where user_id = v_user_id;
end;
$$;

grant execute on function public.set_equipped_accent_color to authenticated;
