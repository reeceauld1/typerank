import { getRankTier, PLACEMENT_GAMES } from '../utils/rank.js';

const TIER_COLORS: Record<string, string> = {
  bronze: '#b08d57',
  silver: '#c7ccd1',
  gold: '#ffd24a',
  platinum: '#7dd3fc',
  diamond: '#3b9ee0',
  master: '#b967ff',
  grandmaster: '#f43f5e',
};

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
      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-sm font-semibold" style={{ color }}>
        {tier.name}
      </span>
      <span className="text-sm text-[var(--text-muted)] tabular-nums">{elo.toLocaleString()} elo</span>
    </div>
  );
}
