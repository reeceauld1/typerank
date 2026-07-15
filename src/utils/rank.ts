// Rank tiers derived from elo, mirroring the single-source-of-truth pattern
// in xp.ts (level derived from a pure function of xp) — the tier is never
// stored, only computed from elo + rankedGamesPlayed so it can never drift
// out of sync with the number a player actually sees.
export interface RankTier {
  id: string;
  name: string;
  min: number;
}

export const RANK_TIERS: RankTier[] = [
  { id: 'bronze', name: 'Bronze', min: 0 },
  { id: 'silver', name: 'Silver', min: 900 },
  { id: 'gold', name: 'Gold', min: 1050 },
  { id: 'platinum', name: 'Platinum', min: 1200 },
  { id: 'diamond', name: 'Diamond', min: 1350 },
  { id: 'master', name: 'Master', min: 1500 },
  { id: 'grandmaster', name: 'Grandmaster', min: 1700 },
];

// Shared across RankBadge, the Ranked page's threshold sidebar, and the
// name-color reward swatches, so all three always agree on a tier's color.
export const TIER_COLORS: Record<string, string> = {
  bronze: '#b08d57',
  silver: '#c7ccd1',
  gold: '#ffd24a',
  platinum: '#7dd3fc',
  diamond: '#3b9ee0',
  master: '#b967ff',
  grandmaster: '#f43f5e',
};

// Placements: the first 5 ranked games are unranked regardless of elo —
// elo still updates during them (at a higher K-factor server-side, see
// submit_ranked_result), so by the time placements finish the rating is
// already roughly calibrated.
export const PLACEMENT_GAMES = 5;

export function getRankTier(elo: number, rankedGamesPlayed: number): RankTier | null {
  if (rankedGamesPlayed < PLACEMENT_GAMES) return null;
  for (let i = RANK_TIERS.length - 1; i >= 0; i--) {
    if (elo >= RANK_TIERS[i].min) return RANK_TIERS[i];
  }
  return RANK_TIERS[0];
}
