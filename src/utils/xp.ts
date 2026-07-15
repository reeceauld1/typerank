import type { TestResult, TestMode } from '../types/index.js';

// The only "ranked" word/time values — anything else (a custom count or
// duration, or solo's infinite mode) is unranked practice: half xp, and
// saved under a 0 sentinel value so it can never touch a best-wpm/
// leaderboard column. Used by both solo tests and duels.
export const WORD_PRESETS = [10, 25, 50];
export const TIME_PRESETS = [10, 30, 60];

export function isRankedValue(mode: TestMode, value: number): boolean {
  return mode === 'words' ? WORD_PRESETS.includes(value) : TIME_PRESETS.includes(value);
}

// XP calculation based on WPM and accuracy. xpMultiplier is an extra scaling
// factor on top of the difficulty multiplier below — used to award infinite
// (practice) mode half the usual XP, since value=0 there never matches any
// of the difficulty checks anyway.
export function calculateXP(wpm: number, accuracy: number, mode: TestMode, value: number, xpMultiplier = 1): number {
  const baseXP = Math.floor(wpm * accuracy / 100);

  // Multiplier based on test difficulty
  let multiplier = 1;
  if (mode === 'time') {
    if (value === 60) multiplier = 1.25;
    else if (value === 30) multiplier = 1.1;
    else if (value === 10) multiplier = 1.0;
  } else {
    if (value === 50) multiplier = 1.25;
    else if (value === 25) multiplier = 1.1;
    else if (value === 10) multiplier = 1.0;
  }

  return Math.floor(baseXP * multiplier * xpMultiplier);
}

// XP required to go from `level` to `level + 1`. This is the single source
// of truth for level math — every other function here derives from it, so
// the level number and the progress bar can never disagree with each other.
// Flat — every level takes the same 2500 xp to clear, so level 100 lands at
// exactly 99 * 2500 = 247,500 total xp.
function xpRequiredForLevel(): number {
  return 2500;
}

// Calculate level from total XP
export function calculateLevel(totalXp: number): number {
  let level = 1;
  let xpConsumed = 0;

  while (totalXp >= xpConsumed + xpRequiredForLevel()) {
    xpConsumed += xpRequiredForLevel();
    level++;
  }

  return level;
}

// Get XP needed to go from this level to the next
export function getXpForNextLevel(): number {
  return xpRequiredForLevel();
}

// Get current level progress
export function getLevelProgress(totalXp: number): { current: number; needed: number; percentage: number } {
  const level = calculateLevel(totalXp);
  const xpConsumed = (level - 1) * xpRequiredForLevel();

  const xpInCurrentLevel = totalXp - xpConsumed;
  const xpNeededForNext = xpRequiredForLevel();

  return {
    current: xpInCurrentLevel,
    needed: xpNeededForNext,
    percentage: Math.max(0, Math.min(100, (xpInCurrentLevel / xpNeededForNext) * 100)),
  };
}

// Check if test result earns a challenge bonus
export function checkChallengeMilestone(result: TestResult): { achieved: boolean; bonus: number; message?: string } {
  const { wpm, accuracy, mode, value } = result;

  // Example milestones
  const milestones = [
    { wpm: 100, mode: 'time', value: 10, bonus: 100, message: '100 WPM on 10s test!' },
    { wpm: 80, mode: 'time', value: 30, bonus: 150, message: '80 WPM on 30s test!' },
    { wpm: 70, mode: 'time', value: 60, bonus: 200, message: '70 WPM on 60s test!' },
    { wpm: 100, mode: 'words', value: 10, bonus: 100, message: '100 WPM on 10 words!' },
    { wpm: 90, mode: 'words', value: 25, bonus: 150, message: '90 WPM on 25 words!' },
    { wpm: 80, mode: 'words', value: 50, bonus: 200, message: '80 WPM on 50 words!' },
  ];

  const achieved = milestones.find(
    m => wpm >= m.wpm && mode === m.mode && value === m.value && accuracy >= 95
  );

  if (achieved) {
    return { achieved: true, bonus: achieved.bonus, message: achieved.message };
  }

  return { achieved: false, bonus: 0 };
}
