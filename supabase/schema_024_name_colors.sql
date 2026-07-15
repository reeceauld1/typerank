-- Ranked-tier rewards: a username color rather than a border. Replaces the
-- rank_bronze..rank_grandmaster border_catalog rows added in
-- schema_021_ranked.sql (never actually reachable yet — ranked matchmaking
-- had just shipped — but cleaned up here in case any install did equip
-- one) with a dedicated name-color catalog. Unlock logic (gated on
-- peak_elo) lives in NAME_COLOR_CATALOG in src/utils/cosmetics.tsx, same
-- pattern as every other cosmetic.
update public.user_stats set equipped_border = 'none' where equipped_border like 'rank_%';
delete from public.border_catalog where id like 'rank_%';

create table public.name_color_catalog (id text primary key);

insert into public.name_color_catalog (id) values
  ('default'), ('bronze'), ('silver'), ('gold'), ('platinum'), ('diamond'), ('master'), ('grandmaster');

alter table public.user_stats
  add column equipped_name_color text not null default 'default' references public.name_color_catalog (id);

-- Mirrors set_equipped_accent_color/set_equipped_cosmetics: the foreign key
-- above rejects an unknown id; actual unlock-eligibility (peak_elo) is
-- checked client-side, same as every other cosmetic here.
create or replace function public.set_equipped_name_color(p_color_id text)
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
  set equipped_name_color = p_color_id, updated_at = now()
  where user_id = v_user_id;
end;
$$;

grant execute on function public.set_equipped_name_color to authenticated;
