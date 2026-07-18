import type { UserStats } from '../types/index.js';
import { calculateLevel } from './xp.js';

export function mapStatsRow(row: Record<string, number | string> | null): Omit<UserStats, 'testHistory'> {
  const totalXp = (row?.total_xp as number) ?? 0;
  return {
    username: (row?.username as string) ?? '',
    usernameChangedAt: (row?.username_changed_at as string | null | undefined) ?? null,
    totalTests: (row?.total_tests as number) ?? 0,
    totalXp,
    level: calculateLevel(totalXp),
    totalTimeTyped: (row?.total_time_typed as number) ?? 0,
    totalAccuracySum: (row?.total_accuracy_sum as number) ?? 0,
    totalWpmSum: (row?.total_wpm_sum as number) ?? 0,
    bestWpm: {
      time10: (row?.best_wpm_time10 as number) ?? 0,
      time30: (row?.best_wpm_time30 as number) ?? 0,
      time60: (row?.best_wpm_time60 as number) ?? 0,
      words10: (row?.best_wpm_words10 as number) ?? 0,
      words25: (row?.best_wpm_words25 as number) ?? 0,
      words50: (row?.best_wpm_words50 as number) ?? 0,
    },
    equippedAvatar: (row?.equipped_avatar as string) ?? 'keyboard',
    equippedBorder: (row?.equipped_border as string) ?? 'none',
    equippedAccentColor: (row?.equipped_accent_color as string) ?? 'blue',
    customAccentHex: (row?.custom_accent_hex as string | undefined) ?? null,
    equippedNameColor: (row?.equipped_name_color as string) ?? 'default',
    equippedBadge: (row?.equipped_badge as string | null | undefined) ?? null,
    discordAvatarUrl: (row?.discord_avatar_url as string | undefined) ?? null,
    isFounder: Boolean(row?.is_founder),
    isSupporter: Boolean(row?.is_supporter),
    isFastTyper: Boolean(row?.is_fast_typer),
    isGoat: Boolean(row?.is_goat),
    isBugFixer: Boolean(row?.is_bug_fixer),
    elo: (row?.elo as number) ?? 1000,
    peakElo: (row?.peak_elo as number) ?? 1000,
    rankedGamesPlayed: (row?.ranked_games_played as number) ?? 0,
    rankedWins: (row?.ranked_wins as number) ?? 0,
    rankedLosses: (row?.ranked_losses as number) ?? 0,
    rankedDraws: (row?.ranked_draws as number) ?? 0,
  };
}
