import type { TestMode, TimeMode, WordMode } from '../types/index.js';

export interface DailyChallenge {
  mode: TestMode;
  value: TimeMode | WordMode;
  testsTarget: number;
  xpBonus: number;
}

// Each entry represents roughly the same amount of typing time (~2.5-3
// minutes), so the six variants stay comparable in effort despite the very
// different test counts.
const DAILY_CHALLENGE_POOL: Omit<DailyChallenge, 'xpBonus'>[] = [
  { mode: 'time', value: 10, testsTarget: 15 },
  { mode: 'time', value: 30, testsTarget: 5 },
  { mode: 'time', value: 60, testsTarget: 3 },
  { mode: 'words', value: 10, testsTarget: 15 },
  { mode: 'words', value: 25, testsTarget: 5 },
  { mode: 'words', value: 50, testsTarget: 3 },
];

export const DAILY_CHALLENGE_XP_BONUS = 1000;

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (Math.imul(31, hash) + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function todayKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

// Deterministic per (identity, day): rotates through a fixed pool of
// "complete N tests of this mode/value" challenges, so the same identity
// always gets the same challenge on a given day, and a different one tomorrow.
export function getDailyChallenge(identity: string, date: Date = new Date()): DailyChallenge {
  const seed = hashString(`${identity}:${todayKey(date)}`);
  const pick = DAILY_CHALLENGE_POOL[seed % DAILY_CHALLENGE_POOL.length];
  return { ...pick, xpBonus: DAILY_CHALLENGE_XP_BONUS };
}
