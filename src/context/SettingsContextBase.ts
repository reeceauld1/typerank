import { createContext } from 'react';

export interface SettingsContextType {
  showKeyboard: boolean;
  setShowKeyboard: (value: boolean) => void;
}

export const SettingsContext = createContext<SettingsContextType | undefined>(undefined);
