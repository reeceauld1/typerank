import React, { useState, useEffect } from 'react';
import type { KeyboardLayoutId } from '../utils/keyboardLayouts.js';
import { FONT_OPTIONS, getFont } from '../utils/fonts.js';
import type { WordListSize } from '../utils/words.js';
import type { KeyboardKeyColors, KeyboardPressStyle, SpaceStyle, Theme } from './SettingsContextBase.js';
import { SettingsContext } from './SettingsContextBase.js';

const SHOW_KEYBOARD_KEY = 'showKeyboard';
const KEYBOARD_LAYOUT_KEY = 'keyboardLayout';
const KEYBOARD_KEY_COLORS_KEY = 'keyboardKeyColors';
const KEYBOARD_PRESS_STYLE_KEY = 'keyboardPressStyle';
const THEME_KEY = 'theme';
const FONT_KEY = 'font';
const SPACE_STYLE_KEY = 'spaceStyle';
const WORD_LIST_SIZE_KEY = 'wordListSize';

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

function loadKeyboardKeyColors(): KeyboardKeyColors {
  try {
    const saved = localStorage.getItem(KEYBOARD_KEY_COLORS_KEY);
    if (saved === 'default' || saved === 'colors' || saved === 'colors-and-text') return saved;
  } catch {
    // ignore malformed/unavailable storage, fall back to the default below
  }
  return 'default';
}

function loadKeyboardPressStyle(): KeyboardPressStyle {
  try {
    const saved = localStorage.getItem(KEYBOARD_PRESS_STYLE_KEY);
    if (saved === 'static' || saved === 'press' || saved === 'accent') return saved;
  } catch {
    // ignore malformed/unavailable storage, fall back to the default below
  }
  return 'press';
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

function loadWordListSize(): WordListSize {
  try {
    const saved = localStorage.getItem(WORD_LIST_SIZE_KEY);
    if (saved === '300' || saved === '1000' || saved === '2500') return saved;
  } catch {
    // ignore malformed/unavailable storage, fall back to the default below
  }
  return '300';
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
  const [keyboardKeyColors, setKeyboardKeyColors] = useState<KeyboardKeyColors>(loadKeyboardKeyColors);
  const [keyboardPressStyle, setKeyboardPressStyle] = useState<KeyboardPressStyle>(loadKeyboardPressStyle);
  const [theme, setTheme] = useState<Theme>(loadTheme);
  const [font, setFont] = useState<string>(loadFont);
  const [spaceStyle, setSpaceStyle] = useState<SpaceStyle>(loadSpaceStyle);
  const [wordListSize, setWordListSize] = useState<WordListSize>(loadWordListSize);

  useEffect(() => {
    localStorage.setItem(SHOW_KEYBOARD_KEY, String(showKeyboard));
  }, [showKeyboard]);

  useEffect(() => {
    localStorage.setItem(KEYBOARD_LAYOUT_KEY, keyboardLayout);
  }, [keyboardLayout]);

  useEffect(() => {
    localStorage.setItem(KEYBOARD_KEY_COLORS_KEY, keyboardKeyColors);
  }, [keyboardKeyColors]);

  useEffect(() => {
    localStorage.setItem(KEYBOARD_PRESS_STYLE_KEY, keyboardPressStyle);
  }, [keyboardPressStyle]);

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
    localStorage.setItem(WORD_LIST_SIZE_KEY, wordListSize);
  }, [wordListSize]);

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
        keyboardKeyColors,
        setKeyboardKeyColors,
        keyboardPressStyle,
        setKeyboardPressStyle,
        theme,
        setTheme,
        font,
        setFont,
        spaceStyle,
        setSpaceStyle,
        wordListSize,
        setWordListSize,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}
