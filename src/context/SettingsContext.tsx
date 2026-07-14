import React, { useState, useEffect } from 'react';
import type { KeyboardLayoutId } from '../utils/keyboardLayouts.js';
import { FONT_OPTIONS, getFont } from '../utils/fonts.js';
import type { SpaceStyle, Theme } from './SettingsContextBase.js';
import { SettingsContext } from './SettingsContextBase.js';

const SHOW_KEYBOARD_KEY = 'showKeyboard';
const KEYBOARD_LAYOUT_KEY = 'keyboardLayout';
const THEME_KEY = 'theme';
const FONT_KEY = 'font';
const SPACE_STYLE_KEY = 'spaceStyle';

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

function loadFont(): string {
  try {
    const saved = localStorage.getItem(FONT_KEY);
    if (saved && FONT_OPTIONS.some(f => f.id === saved)) return saved;
  } catch {
    // ignore malformed/unavailable storage, fall back to the default below
  }
  return FONT_OPTIONS[0].id;
}

function loadSpaceStyle(): SpaceStyle {
  try {
    const saved = localStorage.getItem(SPACE_STYLE_KEY);
    if (saved === 'space' || saved === 'underscore' || saved === 'dot') return saved;
  } catch {
    // ignore malformed/unavailable storage, fall back to the default below
  }
  return 'space';
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
  const [font, setFont] = useState<string>(loadFont);
  const [spaceStyle, setSpaceStyle] = useState<SpaceStyle>(loadSpaceStyle);

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
    localStorage.setItem(FONT_KEY, font);
    document.documentElement.style.setProperty('--font-family', getFont(font).family);
  }, [font]);

  useEffect(() => {
    localStorage.setItem(SPACE_STYLE_KEY, spaceStyle);
  }, [spaceStyle]);

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
    <SettingsContext.Provider
      value={{
        showKeyboard,
        setShowKeyboard,
        keyboardLayout,
        setKeyboardLayout,
        theme,
        setTheme,
        font,
        setFont,
        spaceStyle,
        setSpaceStyle,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}
