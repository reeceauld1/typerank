export type TestMode = 'time' | 'words';

// A plain number covers both the presets (10/30/60, 10/25/50) and any
// custom value the user types in — see xp.ts's WORD_PRESETS/TIME_PRESETS
// for which numbers are "ranked" vs. unranked practice.
export type TimeMode = number | 'infinite';
export type WordMode = number;

// Discriminated on `mode` so narrowing config.mode narrows config.value too
// (e.g. words mode can never statically be 'infinite' — only time mode has
// that option, see the mode selector).
export type TestConfig = { mode: 'time'; value: TimeMode } | { mode: 'words'; value: WordMode };

export interface TestResult {
  id: string;
  timestamp: number;
  mode: TestMode;
  // A plain number, not TimeMode | WordMode — a saved result is always a
  // real value by the time it's recorded (infinite-time runs are saved
  // under a 0 sentinel, since "infinite" itself isn't a storable category).
  value: number;
  wpm: number;
  accuracy: number;
  rawWpm: number;
  correctChars: number;
  incorrectChars: number;
  timeElapsed: number;
  xpEarned: number;
}

export interface UserStats {
  totalTests: number;
  totalXp: number;
  level: number;
  totalTimeTyped: number;
  totalAccuracySum: number;
  totalWpmSum: number;
  bestWpm: {
    time10: number;
    time30: number;
    time60: number;
    words10: number;
    words25: number;
    words50: number;
  };
  testHistory: TestResult[];
  equippedAvatar: string;
  equippedBorder: string;
  equippedAccentColor: string;
  customAccentHex: string | null;
  equippedNameColor: string;
  elo: number;
  peakElo: number;
  rankedGamesPlayed: number;
  rankedWins: number;
  rankedLosses: number;
  rankedDraws: number;
}

export interface Challenge {
  id: string;
  type: 'daily' | 'weekly';
  description: string;
  target: number;
  mode: TestMode;
  value: TimeMode | WordMode;
  xpReward: number;
  completed: boolean;
  expiresAt: number;
}

export interface FriendEntry {
  userId: string;
  username: string;
  equippedAvatar: string;
  equippedBorder: string;
  equippedNameColor: string;
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  wpm: number;
  accuracy: number;
  timestamp: number;
}

export interface Leaderboard {
  time10: LeaderboardEntry[];
  time30: LeaderboardEntry[];
  time60: LeaderboardEntry[];
  words10: LeaderboardEntry[];
  words25: LeaderboardEntry[];
  words50: LeaderboardEntry[];
}
