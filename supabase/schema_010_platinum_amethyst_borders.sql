-- Adds the "platinum" (level 40, between gold and diamond) and "amethyst"
-- (level 75, between diamond and legend) border tiers — see
-- src/utils/cosmetics.tsx for the unlock conditions and glow styling.

insert into public.border_catalog (id) values ('platinum'), ('amethyst')
  on conflict (id) do nothing;
