-- Adds the "monochrome" accent color option (renamed from "teal" on the
-- client — see src/utils/accentColors.ts). It has no fixed hex: the client
-- resolves it via CSS ([data-accent-mono='true'] in index.css), which
-- renders white on dark theme / black on light theme. "teal" is left in the
-- catalog rather than removed, since any row still referencing it would
-- violate the foreign key on user_stats.equipped_accent_color otherwise —
-- it's just no longer offered as a choice.

insert into public.accent_color_catalog (id) values ('monochrome')
  on conflict (id) do nothing;
