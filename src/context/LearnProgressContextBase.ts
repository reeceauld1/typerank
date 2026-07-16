import { createContext } from 'react';
import type { LetterAccuracy } from '../utils/learnMode.js';

export interface LearnProgressContextType {
  unlockedLetters: string[];
  letterAccuracy: LetterAccuracy;
  totalRepsSinceUnlock: number;
  loading: boolean;
  saveProgress: (nextUnlocked: string[], nextAccuracy: LetterAccuracy, nextReps: number) => void;
  resetProgress: () => void;
}

export const LearnProgressContext = createContext<LearnProgressContextType | undefined>(undefined);
