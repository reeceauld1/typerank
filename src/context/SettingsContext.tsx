import React, { useState, useEffect } from 'react';
import { SettingsContext } from './SettingsContextBase.js';

const SHOW_KEYBOARD_KEY = 'showKeyboard';

function loadShowKeyboard(): boolean {
  try {
    return localStorage.getItem(SHOW_KEYBOARD_KEY) === 'true';
  } catch {
    return false;
  }
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [showKeyboard, setShowKeyboard] = useState(loadShowKeyboard);

  useEffect(() => {
    localStorage.setItem(SHOW_KEYBOARD_KEY, String(showKeyboard));
  }, [showKeyboard]);

  return (
    <SettingsContext.Provider value={{ showKeyboard, setShowKeyboard }}>
      {children}
    </SettingsContext.Provider>
  );
}
