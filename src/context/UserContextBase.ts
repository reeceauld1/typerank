import { createContext } from 'react';
import type { UserStats, TestResult } from '../types/index.js';
import type { DailyChallenge } from '../utils/dailyChallenge.js';

export interface UserContextType {
  stats: UserStats;
  loading: boolean;
  lastXpGained: number | null;
  isAccountSynced: boolean;
  claimedToday: boolean;
  dailyChallenge: DailyChallenge | null;
  dailyChallengeTestsToday: number;
  testsThisWeek: number;
  weeklyClaimed: boolean;
  addTestResult: (result: Omit<TestResult, 'id' | 'timestamp' | 'xpEarned'>) => Promise<number>;
  clearLastXpGained: () => void;
  claimDailyChallengeBonus: () => Promise<boolean>;
  claimWeeklyChallengeBonus: (weekStart: string, testsTarget: number, xpBonus: number) => Promise<boolean>;
  setEquippedCosmetics: (avatarId: string, borderId: string) => Promise<void>;
}

export const UserContext = createContext<UserContextType | undefined>(undefined);
