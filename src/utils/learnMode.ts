import type { KeyboardLayoutId } from './keyboardLayouts.js';
import { getAnchorLetters, getLayoutUnlockOrder, getNextLetterToUnlock } from './keyboardLayouts.js';
import { WORDS_2500 } from './words.js';

export { getLayoutUnlockOrder, getNextLetterToUnlock };

const RECENT_LETTER_BOOST = 2; // how many extra times a recent-letter word is duplicated into the pick pool
// Every unlocked letter is guaranteed at least this many reps per round —
// real words don't evenly cover every letter (especially a rare one right
// after it unlocks), and leaving that to chance can leave a letter's EMA
// accuracy stuck for many rounds since it wouldn't reliably reappear to
// correct it. Reinforcement words (see generatePracticeText) top up any
// shortfall.
const MIN_REPS_PER_LETTER = 3;
export const ROUND_WORD_COUNT = 20; // deliberately not a WORD_PRESETS value (10/25/50) so isRanked stays false
const EMA_ALPHA = 0.1;
const UNLOCK_ACCURACY_THRESHOLD = 0.9;
const UNLOCK_MIN_REPS = 30;

export function anchorLetters(layoutId: KeyboardLayoutId): string[] {
  return getAnchorLetters(layoutId);
}

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Real words (from the site's own word list) using only the given letters —
// as more letters unlock, more of the dictionary becomes available.
function realWordsForLetters(allowed: Set<string>): string[] {
  return WORDS_2500.filter(word => [...word].every(ch => allowed.has(ch)));
}

// Real English words filtered to only the currently-unlocked letters, with
// the pool of real words growing as more letters unlock. Falls back to
// short repeated-letter "reinforcement" words for any letter real words
// didn't cover enough this round — matters early on especially, since
// rarer letters (j, k, q, x, z...) barely appear in real English words.
export function generatePracticeText(unlockedLetters: string[], wordCount: number = ROUND_WORD_COUNT): string {
  const allowed = new Set(unlockedLetters);
  const recent = unlockedLetters[unlockedLetters.length - 1];
  const realWords = realWordsForLetters(allowed);

  const words: string[] = [];
  if (realWords.length > 0) {
    const withRecent = recent ? realWords.filter(w => w.includes(recent)) : [];
    const pickPool = withRecent.length >= 3 ? [...realWords, ...Array(RECENT_LETTER_BOOST).fill(withRecent).flat()] : realWords;
    // Scales down for small pools so it doesn't burn all 50 retry attempts
    // rejecting near-every candidate as "too recent".
    const noRepeatWindow = Math.max(1, Math.min(20, Math.floor(realWords.length / 2)));
    for (let i = 0; i < wordCount; i++) {
      const recentWindow = words.slice(Math.max(0, words.length - noRepeatWindow));
      let candidate = pickPool[Math.floor(Math.random() * pickPool.length)];
      let attempts = 0;
      while (recentWindow.includes(candidate) && attempts < 30) {
        candidate = pickPool[Math.floor(Math.random() * pickPool.length)];
        attempts++;
      }
      words.push(candidate);
    }
  }

  const coverage: Record<string, number> = {};
  for (const word of words) for (const ch of word) coverage[ch] = (coverage[ch] ?? 0) + 1;
  for (const letter of unlockedLetters) {
    const have = coverage[letter] ?? 0;
    if (have < MIN_REPS_PER_LETTER) {
      words.push(letter.repeat(MIN_REPS_PER_LETTER - have));
    }
  }

  return shuffle(words).join(' ');
}

export type LetterTally = Record<string, { correct: number; total: number }>;
export type LetterAccuracy = Record<string, number>; // 0-1 fraction, EMA-smoothed

export function mergeLetterAccuracy(prev: LetterAccuracy, roundTallies: LetterTally): LetterAccuracy {
  const next = { ...prev };
  for (const [letter, { correct, total }] of Object.entries(roundTallies)) {
    if (total === 0) continue;
    const roundAccuracy = correct / total;
    next[letter] = letter in prev ? prev[letter] * (1 - EMA_ALPHA) + roundAccuracy * EMA_ALPHA : roundAccuracy;
  }
  return next;
}

export function totalRepsInRound(roundTallies: LetterTally): number {
  return Object.values(roundTallies).reduce((sum, t) => sum + t.total, 0);
}

// Missing letters (never yet typed) count as 0 here — deliberately, so a
// freshly-unlocked letter must actually be attempted at least once before
// the next one can unlock.
export function isReadyToUnlock(unlockedLetters: string[], letterAccuracy: LetterAccuracy, totalRepsSinceUnlock: number): boolean {
  if (totalRepsSinceUnlock < UNLOCK_MIN_REPS) return false;
  const worst = Math.min(...unlockedLetters.map(letter => letterAccuracy[letter] ?? 0));
  return worst >= UNLOCK_ACCURACY_THRESHOLD;
}
