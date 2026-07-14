import { useState, useEffect } from 'react';
import { useSettings } from '../hooks/useSettings.js';
import type { KeyboardLayoutId } from '../utils/keyboardLayouts.js';
import { KEYBOARD_LAYOUTS } from '../utils/keyboardLayouts.js';

const KEY_SIZE = 40;
const GAP = 8;
const UNIT = KEY_SIZE + GAP;
const ROW3_OFFSET = 48;

const BASE_ROW1 = ['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP'];
const BASE_ROW2 = ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL'];
const BASE_ROW3 = ['KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM', 'Comma'];

// Extra keys shown per layout, beyond the qwerty base rows — only where that
// layout actually puts something worth showing there. QWERTY has none (no
// entries below), so its keyboard looks exactly as it always has.
//
// Colemak's own diagram: top row ends "... u y ; [", home row ends "... i o".
// Dvorak's: top row ends "... c r l / =", home row ends "... t n s -".
const ROW1_EXTRA: Partial<Record<KeyboardLayoutId, string[]>> = {
  colemak: ['BracketLeft'],
  dvorak: ['BracketLeft', 'BracketRight'],
};
const ROW2_EXTRA: Partial<Record<KeyboardLayoutId, string[]>> = {
  colemak: ['Semicolon'],
  dvorak: ['Semicolon', 'Quote'],
};
const ROW3_EXTRA: Partial<Record<KeyboardLayoutId, string[]>> = {
  colemak: ['Period'],
  dvorak: ['Period', 'Slash'],
};

const ALL_ROW1_EXTRA_CODES = Object.values(ROW1_EXTRA).flat();
const ALL_ROW2_EXTRA_CODES = Object.values(ROW2_EXTRA).flat();
const ALL_ROW3_EXTRA_CODES = Object.values(ROW3_EXTRA).flat();
const TRACKED_CODES = new Set([
  ...BASE_ROW1, ...BASE_ROW2, ...BASE_ROW3,
  ...ALL_ROW1_EXTRA_CODES, ...ALL_ROW2_EXTRA_CODES, ...ALL_ROW3_EXTRA_CODES,
  'Space',
]);

function Key({ label, pressed, width }: { label: string; pressed: boolean; width?: number }) {
  return (
    <div
      className={`flex items-center justify-center rounded-lg border-2 transition-all duration-100 h-10 ${width ? '' : 'w-10'} ${
        pressed
          ? 'bg-[var(--accent)] border-[var(--accent)] translate-y-[3px] shadow-[0_0px_0_0_var(--border)]'
          : 'bg-[var(--surface)] border-[var(--border)] shadow-[0_3px_0_0_var(--border)]'
      }`}
      style={width ? { width } : undefined}
    >
      <span
        className={`text-sm font-semibold uppercase transition-colors duration-100 ${
          pressed ? 'text-[var(--bg)]' : 'text-[var(--text-correct)]'
        }`}
      >
        {label}
      </span>
    </div>
  );
}

export default function OnScreenKeyboard() {
  const { keyboardLayout } = useSettings();
  const [pressed, setPressed] = useState<Set<string>>(new Set());
  const codeToChar = KEYBOARD_LAYOUTS[keyboardLayout];
  const row1 = [...BASE_ROW1, ...(ROW1_EXTRA[keyboardLayout] ?? [])];
  const row2 = [...BASE_ROW2, ...(ROW2_EXTRA[keyboardLayout] ?? [])];
  const row3 = [...BASE_ROW3, ...(ROW3_EXTRA[keyboardLayout] ?? [])];
  // Spans from the center of the first bottom-row key to the center of the
  // last one, so it resizes automatically as that row's key count changes
  // per layout instead of using a fixed width.
  const spacebarWidth = (row3.length - 1) * UNIT;

  useEffect(() => {
    const codeFor = (e: KeyboardEvent): string | null => {
      const code = e.code === ' ' ? 'Space' : e.code;
      return TRACKED_CODES.has(code) ? code : null;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const code = codeFor(e);
      if (!code) return;
      setPressed(prev => (prev.has(code) ? prev : new Set(prev).add(code)));
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const code = codeFor(e);
      if (!code) return;
      setPressed(prev => {
        if (!prev.has(code)) return prev;
        const next = new Set(prev);
        next.delete(code);
        return next;
      });
    };

    const handleBlur = () => setPressed(new Set());

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  // Row offsets (24px/48px) were tuned to center each qwerty row under row 1
  // and are kept fixed even when an alt layout appends its extra key(s) —
  // z/comma (which the spacebar spans between) don't move either way, only
  // trailing keys get added, so those offsets stay correct in both cases.
  // Labels come from the selected layout, not the physical code, so this
  // keyboard always shows what a key currently types.
  return (
    <div className="flex justify-center select-none">
      <div className="flex flex-col items-start gap-2">
        <div className="flex gap-2">
          {row1.map(code => (
            <Key key={code} label={codeToChar[code] ?? ''} pressed={pressed.has(code)} />
          ))}
        </div>
        <div className="flex gap-2 ml-[24px]">
          {row2.map(code => (
            <Key key={code} label={codeToChar[code] ?? ''} pressed={pressed.has(code)} />
          ))}
        </div>
        <div className="flex gap-2" style={{ marginLeft: ROW3_OFFSET }}>
          {row3.map(code => (
            <Key key={code} label={codeToChar[code] ?? ''} pressed={pressed.has(code)} />
          ))}
        </div>
        <div className="flex gap-2 mt-1" style={{ marginLeft: ROW3_OFFSET + KEY_SIZE / 2 }}>
          <Key label="" pressed={pressed.has('Space')} width={spacebarWidth} />
        </div>
      </div>
    </div>
  );
}
