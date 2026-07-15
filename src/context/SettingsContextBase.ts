import { createContext } from 'react';
import type { KeyboardLayoutId } from '../utils/keyboardLayouts.js';
import type { WordListSize } from '../utils/words.js';

export type Theme = 'light' | 'dark' | 'system';
export type SpaceStyle = 'space' | 'underscore' | 'dot';

export interface SettingsContextType {
  showKeyboard: boolean;
  setShowKeyboard: (value: boolean) => void;
  keyboardLayout: KeyboardLayoutId;
  setKeyboardLayout: (value: KeyboardLayoutId) => void;
  theme: Theme;
  setTheme: (value: Theme) => void;
  font: string;
  setFont: (value: string) => void;
  spaceStyle: SpaceStyle;
  setSpaceStyle: (value: SpaceStyle) => void;
  wordListSize: WordListSize;
  setWordListSize: (value: WordListSize) => void;
}

export const SettingsContext = createContext<SettingsContextType | undefined>(undefined);
