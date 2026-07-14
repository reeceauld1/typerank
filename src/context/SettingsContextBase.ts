import { createContext } from 'react';
import type { KeyboardLayoutId } from '../utils/keyboardLayouts.js';

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
}

export const SettingsContext = createContext<SettingsContextType | undefined>(undefined);
