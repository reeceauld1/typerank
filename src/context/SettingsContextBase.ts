import { createContext } from 'react';
import type { KeyboardLayoutId } from '../utils/keyboardLayouts.js';

export interface SettingsContextType {
  showKeyboard: boolean;
  setShowKeyboard: (value: boolean) => void;
  keyboardLayout: KeyboardLayoutId;
  setKeyboardLayout: (value: KeyboardLayoutId) => void;
}

export const SettingsContext = createContext<SettingsContextType | undefined>(undefined);
