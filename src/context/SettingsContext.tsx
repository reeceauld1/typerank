import React, { useState, useEffect } from 'react';
import type { KeyboardLayoutId } from '../utils/keyboardLayouts.js';
import { SettingsContext } from './SettingsContextBase.js';

const SHOW_KEYBOARD_KEY = 'showKeyboard';
const KEYBOARD_LAYOUT_KEY = 'keyboardLayout';

function loadShowKeyboard(): boolean {
  try {
    return localStorage.getItem(SHOW_KEYBOARD_KEY) === 'true';
  } catch {
    return false;
  }
}

function loadKeyboardLayout(): KeyboardLayoutId {
  try {
    const saved = localStorage.getItem(KEYBOARD_LAYOUT_KEY);
    if (saved === 'qwerty' || saved === 'colemak' || saved === 'dvorak') return saved;
  } catch {
    // ignore malformed/unavailable storage, fall back to the default below
  }
  return 'qwerty';
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [showKeyboard, setShowKeyboard] = useState(loadShowKeyboard);
  const [keyboardLayout, setKeyboardLayout] = useState<KeyboardLayoutId>(loadKeyboardLayout);

  useEffect(() => {
    localStorage.setItem(SHOW_KEYBOARD_KEY, String(showKeyboard));
  }, [showKeyboard]);

  useEffect(() => {
    localStorage.setItem(KEYBOARD_LAYOUT_KEY, keyboardLayout);
  }, [keyboardLayout]);

  return (
    <SettingsContext.Provider value={{ showKeyboard, setShowKeyboard, keyboardLayout, setKeyboardLayout }}>
      {children}
    </SettingsContext.Provider>
  );
}
