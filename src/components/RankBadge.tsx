import { getRankTier, PLACEMENT_GAMES, TIER_COLORS } from '../utils/rank.js';
import TierLabel from './TierLabel.js';

interface RankBadgeProps {
  elo: number;
  rankedGamesPlayed: number;
  className?: string;
}

export default function RankBadge({ elo, rankedGamesPlayed, className = '' }: RankBadgeProps) {
  const tier = getRankTier(elo, rankedGamesPlayed);

  if (!tier) {
    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        <span className="w-2.5 h-2.5 rounded-full bg-[var(--text-muted)]" />
        <span className="text-sm font-medium text-[var(--text-muted)]">
          Unranked · {rankedGamesPlayed}/{PLACEMENT_GAMES} placements
        </span>
      </div>
    );
  }

  const color = TIER_COLORS[tier.id] ?? 'var(--accent)';

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <TierLabel tierId={tier.id} tierName={tier.name} color={color} className="text-sm" />
      <span className="text-sm text-[var(--text-muted)] tabular-nums">{elo.toLocaleString()} elo</span>
    </div>
  );
}
