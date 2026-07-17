// Deterministic string hash shared by the daily and hourly challenge
// pickers (see dailyChallenge.ts / hourlyChallenge.ts) — same (identity,
// period-key) pair always rotates to the same pool entry.
export function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (Math.imul(31, hash) + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}
