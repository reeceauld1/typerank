import type { TestMode, TimeMode, WordMode } from '../types/index.js';
import { hashString } from './hashString.js';

export interface HourlyChallenge {
  mode: TestMode;
  value: TimeMode | WordMode;
  testsTarget: number;
  xpBonus: number;
}

// Much lower effort than the daily pool (~30-60s of typing rather than
// ~2.5-3 minutes) since this recurs every hour instead of once a day.
const HOURLY_CHALLENGE_POOL: Omit<HourlyChallenge, 'xpBonus'>[] = [
  { mode: 'time', value: 10, testsTarget: 3 },
  { mode: 'time', value: 30, testsTarget: 1 },
  { mode: 'time', value: 60, testsTarget: 1 },
  { mode: 'words', value: 10, testsTarget: 3 },
  { mode: 'words', value: 25, testsTarget: 1 },
  { mode: 'words', value: 50, testsTarget: 1 },
];

export const HOURLY_CHALLENGE_XP_BONUS = 500;

// UTC-hour-keyed so it lines up with claim_hourly_challenge's
// date_trunc('hour', now()) server-side (Supabase's DB session runs in UTC).
export function hourKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 13); // 'YYYY-MM-DDTHH'
}

// The exact instant that key's hour started — what the test-count query and
// the claim's unique constraint both key off, since "2026-07-17T14" alone
// isn't a value Postgres can compare a timestamptz against.
export function hourStart(date: Date = new Date()): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours(), 0, 0, 0));
}

// Deterministic per (identity, hour): rotates through a fixed pool of
// "complete N tests of this mode/value" challenges, same pattern as
// getDailyChallenge but keyed by hour instead of day.
export function getHourlyChallenge(identity: string, date: Date = new Date()): HourlyChallenge {
  const seed = hashString(`${identity}:${hourKey(date)}`);
  const pick = HOURLY_CHALLENGE_POOL[seed % HOURLY_CHALLENGE_POOL.length];
  return { ...pick, xpBonus: HOURLY_CHALLENGE_XP_BONUS };
}

export function nextHourlyReset(date: Date = new Date()): Date {
  const start = hourStart(date);
  return new Date(start.getTime() + 60 * 60 * 1000);
}
