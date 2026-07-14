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
