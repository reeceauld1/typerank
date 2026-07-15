import { useEffect, useState } from 'react';
import type { Finger, KeyboardLayoutId } from '../utils/keyboardLayouts.js';
import {
  KEYBOARD_LAYOUTS,
  ROW1_EXTRA,
  ROW2_EXTRA,
  ROW3_EXTRA,
  FINGER_COLORS,
  FINGER_LABELS,
  FINGER_ORDER,
  getLayoutRowCodes,
  getFingerForCode,
  isBumpCode,
} from '../utils/keyboardLayouts.js';
import type { KeyboardKeyColors } from '../context/SettingsContextBase.js';

const KEY_SIZE = 40;
const GAP = 8;
const UNIT = KEY_SIZE + GAP;
const ROW3_OFFSET = 48;

const BASE_CODES = getLayoutRowCodes('qwerty'); // no per-layout extras, just the qwerty-position base rows
const ALL_ROW1_EXTRA_CODES = Object.values(ROW1_EXTRA).flat();
const ALL_ROW2_EXTRA_CODES = Object.values(ROW2_EXTRA).flat();
const ALL_ROW3_EXTRA_CODES = Object.values(ROW3_EXTRA).flat();
const TRACKED_CODES = new Set([
  ...BASE_CODES.top, ...BASE_CODES.home, ...BASE_CODES.bottom,
  ...ALL_ROW1_EXTRA_CODES, ...ALL_ROW2_EXTRA_CODES, ...ALL_ROW3_EXTRA_CODES,
  'Space',
]);

// Red (bad) to green (good) — hue 0 at 0% accuracy, hue 120 at 100%.
function accuracyOverlayColor(accuracy: number): string {
  const hue = Math.max(0, Math.min(1, accuracy)) * 120;
  return `hsla(${hue}, 70%, 45%, 0.55)`;
}

// Darker version of the same hue, used for the press-down state instead of
// the generic accent color — so pressing a green (good accuracy) key stays
// green, just darker, rather than flashing the site's unrelated accent hue.
function accuracyPressColor(accuracy: number): string {
  const hue = Math.max(0, Math.min(1, accuracy)) * 120;
  return `hsl(${hue}, 70%, 28%)`;
}

function Key({
  label,
  active,
  dimmed,
  width,
  bump,
  accuracy,
  finger,
}: {
  label: string;
  active: boolean;
  dimmed?: boolean;
  width?: number;
  bump?: boolean;
  accuracy?: number;
  finger?: Finger | null;
}) {
  const hasAccuracyColor = accuracy !== undefined && !dimmed;
  const textColorClass = active ? (hasAccuracyColor ? 'text-white' : 'text-[var(--bg)]') : 'text-[var(--text-correct)]';
  // The accuracy tint (and its darker pressed variant) override the plain
  // surface/accent background via inline style (higher specificity than the
  // bg-* classes) — locked keys never show it, since they have no accuracy
  // data yet.
  const colorOverrideStyle =
    hasAccuracyColor && accuracy !== undefined
      ? active
        ? { backgroundColor: accuracyPressColor(accuracy), borderColor: accuracyPressColor(accuracy) }
        : { backgroundColor: accuracyOverlayColor(accuracy) }
      : undefined;
  return (
    <div
      className={`relative flex items-center justify-center rounded-lg border-2 transition-all duration-100 h-10 ${width ? '' : 'w-10'} ${
        dimmed ? 'opacity-40' : ''
      } ${
        active
          ? 'bg-[var(--accent)] border-[var(--accent)] translate-y-[3px] shadow-[0_0px_0_0_var(--border)]'
          : 'bg-[var(--surface)] border-[var(--border)] shadow-[0_3px_0_0_var(--border)]'
      }`}
      style={{
        ...(width ? { width } : undefined),
        // Which finger types this key — a border tint so it can sit
        // alongside the accuracy background tint rather than fight it;
        // overridden by the press/accuracy border color below while active.
        ...(finger && !active ? { borderColor: FINGER_COLORS[finger] } : undefined),
        ...colorOverrideStyle,
      }}
    >
      <span className={`text-sm font-semibold uppercase transition-colors duration-100 ${textColorClass}`}>{label}</span>
      {bump && (
        <span
          className={`absolute bottom-1.5 w-3 h-0.5 rounded-full transition-colors duration-100 ${
            active ? (hasAccuracyColor ? 'bg-white' : 'bg-[var(--bg)]') : 'bg-[var(--text-correct)]'
          }`}
        />
      )}
    </div>
  );
}

interface KeyboardDisplayProps {
  keyboardLayout: KeyboardLayoutId;
  // Codes to render at reduced opacity — e.g. not-yet-unlocked letters in
  // learn mode. Omitted/empty for the plain on-screen keyboard, where every
  // key is equally available.
  dimmedCodes?: Set<string>;
  // Per-code accuracy (0-1) tinting each key red->green — learn mode's
  // per-letter accuracy. Omitted for the plain on-screen keyboard.
  accuracyByCode?: Record<string, number>;
  // Settings > on-screen keyboard finger-color display mode. Defaults to
  // "default" (no finger coloring) if omitted.
  keyColors?: KeyboardKeyColors;
}

// Row offsets (24px/48px) were tuned to center each qwerty row under row 1
// and are kept fixed even when an alt layout appends its extra key(s) —
// z/comma (which the spacebar spans between) don't move either way, only
// trailing keys get added, so those offsets stay correct in both cases.
// Labels come from the selected layout, not the physical code, so this
// keyboard always shows what a key currently types.
export default function KeyboardDisplay({ keyboardLayout, dimmedCodes, accuracyByCode, keyColors = 'default' }: KeyboardDisplayProps) {
  const [pressed, setPressed] = useState<Set<string>>(new Set());
  const showFingerColors = keyColors !== 'default';
  const showLegend = keyColors === 'colors-and-text';
  const codeToChar = KEYBOARD_LAYOUTS[keyboardLayout];
  const { top: row1, home: row2, bottom: row3 } = getLayoutRowCodes(keyboardLayout);
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

  return (
    <div className="flex flex-col items-center select-none">
      <div className="flex flex-col items-start gap-2">
        <div className="flex gap-2">
          {row1.map(code => (
            <Key
              key={code}
              label={codeToChar[code] ?? ''}
              active={pressed.has(code)}
              dimmed={dimmedCodes?.has(code)}
              accuracy={accuracyByCode?.[code]}
              finger={showFingerColors ? getFingerForCode(code) : null}
            />
          ))}
        </div>
        <div className="flex gap-2 ml-[24px]">
          {row2.map(code => (
            <Key
              key={code}
              label={codeToChar[code] ?? ''}
              active={pressed.has(code)}
              dimmed={dimmedCodes?.has(code)}
              bump={isBumpCode(code)}
              accuracy={accuracyByCode?.[code]}
              finger={showFingerColors ? getFingerForCode(code) : null}
            />
          ))}
        </div>
        <div className="flex gap-2" style={{ marginLeft: ROW3_OFFSET }}>
          {row3.map(code => (
            <Key
              key={code}
              label={codeToChar[code] ?? ''}
              active={pressed.has(code)}
              dimmed={dimmedCodes?.has(code)}
              accuracy={accuracyByCode?.[code]}
              finger={showFingerColors ? getFingerForCode(code) : null}
            />
          ))}
        </div>
        <div className="flex gap-2 mt-1" style={{ marginLeft: ROW3_OFFSET + KEY_SIZE / 2 }}>
          <Key label="" active={pressed.has('Space')} width={spacebarWidth} finger={showFingerColors ? 'thumb' : null} />
        </div>
      </div>

      {showLegend && (
        <div className="w-full flex flex-wrap justify-center gap-x-4 gap-y-1.5 py-4">
          {FINGER_ORDER.map(finger => (
            <span key={finger} className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: FINGER_COLORS[finger] }} />
              {FINGER_LABELS[finger]}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
