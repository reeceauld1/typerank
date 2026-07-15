import { WORD_PRESETS, TIME_PRESETS, isRankedValue } from './xp.js';

export type DuelMode = 'words' | 'time';

export { WORD_PRESETS, TIME_PRESETS };

export function isRankedDuelValue(mode: DuelMode, value: number): boolean {
  return isRankedValue(mode, value);
}

export function formatDuelSetting(mode: DuelMode, value: number): string {
  return mode === 'words' ? `${value} words` : `${value}s`;
}
