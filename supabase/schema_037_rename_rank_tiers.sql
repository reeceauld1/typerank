-- Renames the top two ranked tiers (RANK_TIERS in src/utils/rank.ts):
-- Master -> Amethyst, Grandmaster -> Legend. Only the name-color reward
-- those tiers unlock is stored server-side (equipped_name_color, gated by
-- name_color_catalog's foreign key) — the tiers themselves are computed
-- client-side from elo, never persisted, so nothing else needs migrating.
insert into public.name_color_catalog (id) values ('amethyst'), ('legend')
  on conflict (id) do nothing;

update public.user_stats set equipped_name_color = 'amethyst' where equipped_name_color = 'master';
update public.user_stats set equipped_name_color = 'legend' where equipped_name_color = 'grandmaster';

delete from public.name_color_catalog where id in ('master', 'grandmaster');
