export type TestMode = 'time' | 'words';

export type TimeMode = 10 | 30 | 60;
export type WordMode = 10 | 25 | 50;

export interface TestConfig {
  mode: TestMode;
  value: TimeMode | WordMode;
}

export interface TestResult {
  id: string;
  timestamp: number;
  mode: TestMode;
  value: TimeMode | WordMode;
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
