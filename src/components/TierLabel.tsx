interface TierLabelProps {
  tierId: string;
  tierName: string;
  color: string;
  className?: string;
}

// Shared by RankBadge (a player's current rank) and the Ranked page's
// threshold sidebar (every tier, as reference) — same animated treatment as
// the name-color reward each tier unlocks (see NAME_COLOR_CATALOG), so the
// badge previews what a player's username does once they reach it. Legend
// gets the rainbow-name gradient/glow directly; every other tier gets the
// metallic shine sweep on top of its solid color, both reusing the exact
// CSS classes UsernameText.tsx applies to an equipped name color.
export default function TierLabel({ tierId, tierName, color, className = '' }: TierLabelProps) {
  const isLegend = tierId === 'legend';
  return (
    <>
      <span
        className={`w-2.5 h-2.5 rounded-full shrink-0 ${isLegend ? 'rank-dot-legend' : 'rank-dot-shine'}`}
        style={isLegend ? undefined : { backgroundColor: color }}
      />
      <span
        className={`relative inline-block font-semibold ${isLegend ? 'rainbow-name' : 'name-shine'} ${className}`}
        style={isLegend ? undefined : { color }}
        data-shine-text={isLegend ? undefined : tierName}
      >
        {tierName}
      </span>
    </>
  );
}
