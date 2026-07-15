export type KeyboardLayoutId = 'qwerty' | 'colemak' | 'dvorak';

export interface KeyboardLayoutOption {
  id: KeyboardLayoutId;
  label: string;
}

export const KEYBOARD_LAYOUT_OPTIONS: KeyboardLayoutOption[] = [
  { id: 'qwerty', label: 'QWERTY' },
  { id: 'colemak', label: 'Colemak' },
  { id: 'dvorak', label: 'Dvorak' },
];

// Maps a physical key (KeyboardEvent.code — the hardware position, fixed
// regardless of the OS's own keyboard layout) to the character each layout
// produces there. Covers the letter rows plus the punctuation keys mixed
// into them, since a couple of those keys carry letters under Colemak
// (semicolon -> o) and Dvorak (semicolon -> s, comma -> w, period -> v,
// slash -> z) even though they're punctuation under QWERTY.
//
// This assumes the user's actual hardware is a standard QWERTY board and
// only this setting remaps it — same assumption every "practice an
// alternate layout without switching your OS" typing test makes. Someone
// whose OS is already set to Colemak/Dvorak at the system level should
// leave this on QWERTY.
export const KEYBOARD_LAYOUTS: Record<KeyboardLayoutId, Record<string, string>> = {
  qwerty: {
    KeyQ: 'q', KeyW: 'w', KeyE: 'e', KeyR: 'r', KeyT: 't', KeyY: 'y', KeyU: 'u', KeyI: 'i', KeyO: 'o', KeyP: 'p',
    KeyA: 'a', KeyS: 's', KeyD: 'd', KeyF: 'f', KeyG: 'g', KeyH: 'h', KeyJ: 'j', KeyK: 'k', KeyL: 'l', Semicolon: ';',
    KeyZ: 'z', KeyX: 'x', KeyC: 'c', KeyV: 'v', KeyB: 'b', KeyN: 'n', KeyM: 'm', Comma: ',', Period: '.', Slash: '/',
    BracketLeft: '[', BracketRight: ']', Quote: "'",
  },
  colemak: {
    KeyQ: 'q', KeyW: 'w', KeyE: 'f', KeyR: 'p', KeyT: 'g', KeyY: 'j', KeyU: 'l', KeyI: 'u', KeyO: 'y', KeyP: ';',
    KeyA: 'a', KeyS: 'r', KeyD: 's', KeyF: 't', KeyG: 'd', KeyH: 'h', KeyJ: 'n', KeyK: 'e', KeyL: 'i', Semicolon: 'o',
    KeyZ: 'z', KeyX: 'x', KeyC: 'c', KeyV: 'v', KeyB: 'b', KeyN: 'k', KeyM: 'm', Comma: ',', Period: '.', Slash: '/',
    BracketLeft: '[', BracketRight: ']', Quote: "'",
  },
  dvorak: {
    // Dvorak's own diagram: top row ends "... l / =", home row ends "... s -".
    KeyQ: "'", KeyW: ',', KeyE: '.', KeyR: 'p', KeyT: 'y', KeyY: 'f', KeyU: 'g', KeyI: 'c', KeyO: 'r', KeyP: 'l',
    KeyA: 'a', KeyS: 'o', KeyD: 'e', KeyF: 'u', KeyG: 'i', KeyH: 'd', KeyJ: 'h', KeyK: 't', KeyL: 'n', Semicolon: 's',
    KeyZ: ';', KeyX: 'q', KeyC: 'j', KeyV: 'k', KeyB: 'x', KeyN: 'b', KeyM: 'm', Comma: 'w', Period: 'v', Slash: 'z',
    BracketLeft: '/', BracketRight: '=', Quote: '-',
  },
};

// Physical key groupings, shared between OnScreenKeyboard (which renders
// every key here, punctuation included) and the learn-mode letter-unlock
// order (which only wants actual letters — see getLayoutRows below).
export const BASE_ROW1 = ['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP'];
export const BASE_ROW2 = ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL'];
export const BASE_ROW3 = ['KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM', 'Comma'];

// Standard touch-typing finger chart — which finger types which physical
// key. This is about hand ergonomics tied to the physical key position, not
// the letter a layout happens to put there, so it's the same chart
// regardless of which layout is selected.
export type Finger = 'left-pinky' | 'left-ring' | 'left-middle' | 'left-index' | 'right-index' | 'right-middle' | 'right-ring' | 'right-pinky' | 'thumb';

// Left-to-right hand order, for rendering a legend.
export const FINGER_ORDER: Finger[] = [
  'left-pinky', 'left-ring', 'left-middle', 'left-index', 'right-index', 'right-middle', 'right-ring', 'right-pinky', 'thumb',
];

export const FINGER_LABELS: Record<Finger, string> = {
  'left-pinky': 'left pinky',
  'left-ring': 'left ring',
  'left-middle': 'left middle',
  'left-index': 'left index',
  'right-index': 'right index',
  'right-middle': 'right middle',
  'right-ring': 'right ring',
  'right-pinky': 'right pinky',
  thumb: 'thumb',
};

export const FINGER_COLORS: Record<Finger, string> = {
  'left-pinky': '#e74c3c',
  'left-ring': '#e67e22',
  'left-middle': '#f1c40f',
  'left-index': '#2ecc71',
  'right-index': '#3498db',
  'right-middle': '#9b59b6',
  'right-ring': '#e91e8c',
  'right-pinky': '#1abc9c',
  thumb: '#95a5a6',
};

const FINGER_BY_CODE: Record<string, Finger> = {
  KeyQ: 'left-pinky', KeyA: 'left-pinky', KeyZ: 'left-pinky',
  KeyW: 'left-ring', KeyS: 'left-ring', KeyX: 'left-ring',
  KeyE: 'left-middle', KeyD: 'left-middle', KeyC: 'left-middle',
  KeyR: 'left-index', KeyF: 'left-index', KeyV: 'left-index', KeyT: 'left-index', KeyG: 'left-index', KeyB: 'left-index',
  KeyY: 'right-index', KeyH: 'right-index', KeyN: 'right-index', KeyU: 'right-index', KeyJ: 'right-index', KeyM: 'right-index',
  KeyI: 'right-middle', KeyK: 'right-middle', Comma: 'right-middle',
  KeyO: 'right-ring', KeyL: 'right-ring', Period: 'right-ring',
  KeyP: 'right-pinky', Semicolon: 'right-pinky', Slash: 'right-pinky',
  BracketLeft: 'right-pinky', BracketRight: 'right-pinky', Quote: 'right-pinky',
  Space: 'thumb',
};

export function getFingerForCode(code: string): Finger | null {
  return FINGER_BY_CODE[code] ?? null;
}

// Extra keys shown per layout, beyond the qwerty base rows. QWERTY shows
// just [ ; . (its own actual punctuation at those positions, for visual
// completeness); Colemak/Dvorak show more since their letters spill onto
// several of those punctuation-position keys.
//
// Colemak's own diagram: top row ends "... u y ; [", home row ends "... i o".
// Dvorak's: top row ends "... c r l / =", home row ends "... t n s -".
export const ROW1_EXTRA: Partial<Record<KeyboardLayoutId, string[]>> = {
  qwerty: ['BracketLeft'],
  colemak: ['BracketLeft'],
  dvorak: ['BracketLeft', 'BracketRight'],
};
export const ROW2_EXTRA: Partial<Record<KeyboardLayoutId, string[]>> = {
  qwerty: ['Semicolon'],
  colemak: ['Semicolon'],
  dvorak: ['Semicolon', 'Quote'],
};
export const ROW3_EXTRA: Partial<Record<KeyboardLayoutId, string[]>> = {
  qwerty: ['Period'],
  colemak: ['Period'],
  dvorak: ['Period', 'Slash'],
};

export interface LayoutRows<T> {
  top: T[];
  home: T[];
  bottom: T[];
}

// Raw physical codes per row, layout-aware (includes punctuation-position
// codes like Comma/Semicolon) — what OnScreenKeyboard renders.
export function getLayoutRowCodes(layoutId: KeyboardLayoutId): LayoutRows<string> {
  return {
    top: [...BASE_ROW1, ...(ROW1_EXTRA[layoutId] ?? [])],
    home: [...BASE_ROW2, ...(ROW2_EXTRA[layoutId] ?? [])],
    bottom: [...BASE_ROW3, ...(ROW3_EXTRA[layoutId] ?? [])],
  };
}

// The home-row keys learn mode starts on — the whole home row except the
// two innermost reach keys (G/H physically), fixed indices in BASE_ROW2
// regardless of layout, so mapping them through KEYBOARD_LAYOUTS gives the
// right starting letters per layout automatically: "asdf jkl" for qwerty
// (the standard touch-typing starting position), whatever Colemak/Dvorak's
// own letters are at those same 7 physical positions for the others.
const ANCHOR_CODES = ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyJ', 'KeyK', 'KeyL'];

// Physical keyboards have a tactile bump on F and J only (not D/K) — these
// are the two home-row orientation keys, fixed by hardware position
// regardless of which layout is selected.
const BUMP_CODES = ['KeyF', 'KeyJ'];

export function getBumpLetters(layoutId: KeyboardLayoutId): string[] {
  const codeToChar = KEYBOARD_LAYOUTS[layoutId];
  return BUMP_CODES.map(code => codeToChar[code]);
}

export function isBumpCode(code: string): boolean {
  return BUMP_CODES.includes(code);
}

// Actual unlockable letters only, per row — filters out codes that produce
// punctuation under this specific layout (e.g. Comma is ',' under
// qwerty/colemak but 'w' under Dvorak; KeyP is ';' under Colemak; Comma only
// lives in BASE_ROW3 for the on-screen spacebar width math, not because it's
// always a letter).
export function getLayoutRows(layoutId: KeyboardLayoutId): LayoutRows<string> {
  const codeToChar = KEYBOARD_LAYOUTS[layoutId];
  const codes = getLayoutRowCodes(layoutId);
  const toLetters = (row: string[]) =>
    row.map(code => codeToChar[code]).filter((ch): ch is string => Boolean(ch) && /^[a-z]$/.test(ch));
  return { top: toLetters(codes.top), home: toLetters(codes.home), bottom: toLetters(codes.bottom) };
}

export function getAnchorLetters(layoutId: KeyboardLayoutId): string[] {
  const codeToChar = KEYBOARD_LAYOUTS[layoutId];
  return ANCHOR_CODES.map(code => codeToChar[code]);
}

// Full 26-letter learn-mode unlock progression for a layout: the home-row
// anchor keys first (see getAnchorLetters), then the rest of the home row,
// then top row, then bottom row — each in left-to-right physical order.
export function getLayoutUnlockOrder(layoutId: KeyboardLayoutId): string[] {
  const anchors = getAnchorLetters(layoutId);
  const { top, home, bottom } = getLayoutRows(layoutId);
  const restOfHome = home.filter(letter => !anchors.includes(letter));
  return [...anchors, ...restOfHome, ...top, ...bottom];
}

export function getNextLetterToUnlock(layoutId: KeyboardLayoutId, unlockedLetters: string[]): string | null {
  return getLayoutUnlockOrder(layoutId).find(letter => !unlockedLetters.includes(letter)) ?? null;
}
