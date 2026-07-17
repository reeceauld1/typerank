import { createContext } from 'react';
import type { UserStats, TestResult } from '../types/index.js';
import type { DailyChallenge } from '../utils/dailyChallenge.js';
import type { HourlyChallenge } from '../utils/hourlyChallenge.js';

export interface UserContextType {
  stats: UserStats;
  loading: boolean;
  lastXpGained: number | null;
  isAccountSynced: boolean;
  claimedThisHour: boolean;
  hourlyChallenge: HourlyChallenge | null;
  hourlyChallengeTestsThisHour: number;
  claimedToday: boolean;
  dailyChallenge: DailyChallenge | null;
  dailyChallengeTestsToday: number;
  testsThisWeek: number;
  weeklyClaimed: boolean;
  addTestResult: (result: Omit<TestResult, 'id' | 'timestamp' | 'xpEarned'>, xpMultiplier?: number) => Promise<number>;
  clearLastXpGained: () => void;
  claimHourlyChallengeBonus: () => Promise<boolean>;
  claimDailyChallengeBonus: () => Promise<boolean>;
  claimWeeklyChallengeBonus: (weekStart: string, testsTarget: number, xpBonus: number) => Promise<boolean>;
  setEquippedCosmetics: (avatarId: string, borderId: string) => Promise<boolean>;
  setEquippedAccentColor: (colorId: string, customHex?: string) => Promise<boolean>;
  setEquippedNameColor: (colorId: string) => Promise<boolean>;
  setEquippedBadge: (badgeId: string | null) => Promise<boolean>;
  refreshStats: () => Promise<void>;
}

export const UserContext = createContext<UserContextType | undefined>(undefined);
