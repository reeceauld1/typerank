import React, { useState, useEffect } from 'react';
import type { KeyboardLayoutId } from '../utils/keyboardLayouts.js';
import type { Theme } from './SettingsContextBase.js';
import { SettingsContext } from './SettingsContextBase.js';

const SHOW_KEYBOARD_KEY = 'showKeyboard';
const KEYBOARD_LAYOUT_KEY = 'keyboardLayout';
const THEME_KEY = 'theme';

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

function loadTheme(): Theme {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
  } catch {
    // ignore malformed/unavailable storage, fall back to the default below
  }
  return 'system';
}

function systemPrefersLight(): boolean {
  try {
    return window.matchMedia('(prefers-color-scheme: light)').matches;
  } catch {
    return false;
  }
}

function resolveTheme(theme: Theme): 'light' | 'dark' {
  return theme === 'system' ? (systemPrefersLight() ? 'light' : 'dark') : theme;
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [showKeyboard, setShowKeyboard] = useState(loadShowKeyboard);
  const [keyboardLayout, setKeyboardLayout] = useState<KeyboardLayoutId>(loadKeyboardLayout);
  const [theme, setTheme] = useState<Theme>(loadTheme);

  useEffect(() => {
    localStorage.setItem(SHOW_KEYBOARD_KEY, String(showKeyboard));
  }, [showKeyboard]);

  useEffect(() => {
    localStorage.setItem(KEYBOARD_LAYOUT_KEY, keyboardLayout);
  }, [keyboardLayout]);

  useEffect(() => {
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    const apply = () => {
      if (resolveTheme(theme) === 'light') document.documentElement.dataset.theme = 'light';
      else delete document.documentElement.dataset.theme;
    };
    apply();

    // Only "system" needs to react live to the OS/browser theme changing
    // while the app is open — an explicit light/dark choice shouldn't move.
    if (theme !== 'system') return;
    const media = window.matchMedia('(prefers-color-scheme: light)');
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme]);

  return (
    <SettingsContext.Provider value={{ showKeyboard, setShowKeyboard, keyboardLayout, setKeyboardLayout, theme, setTheme }}>
      {children}
    </SettingsContext.Provider>
  );
}
