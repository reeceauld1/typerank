import { WORD_PRESETS, TIME_PRESETS, isRankedValue } from './xp.js';

export type DuelMode = 'words' | 'time';

export { WORD_PRESETS, TIME_PRESETS };

export function isRankedDuelValue(mode: DuelMode, value: number): boolean {
  return isRankedValue(mode, value);
}

export function formatDuelSetting(mode: DuelMode, value: number): string {
  return mode === 'words' ? `${value} words` : `${value}s`;
}

// How long a duel invite/link stays live, and how long the various
// duel-related notification cards stick around for - see
// NotificationTimerBar.tsx. Anchored to the duel row's own created_at
// (there's no separate accepted_at column), so the "in progress" reminder's
// budget technically starts at invite-send rather than acceptance - a minor
// imprecision traded for one constant instead of new schema.
export const DUEL_NOTIFICATION_TTL_MS = 5 * 60 * 1000;
