import { useState, useEffect } from 'react';

const ROW1 = ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'];
const ROW2 = ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'];
const ROW3 = ['z', 'x', 'c', 'v', 'b', 'n', 'm', ','];

const SYMBOL_KEYS = new Set([',']);

function Key({ label, pressed, widthClass = 'w-10' }: { label: string; pressed: boolean; widthClass?: string }) {
  return (
    <div
      className={`flex items-center justify-center rounded-lg border-2 transition-all duration-100 h-10 ${widthClass} ${
        pressed
          ? 'bg-white border-white translate-y-[3px] shadow-[0_0px_0_0_var(--border)]'
          : 'bg-[var(--surface)] border-[var(--border)] shadow-[0_3px_0_0_var(--border)]'
      }`}
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
  const [pressed, setPressed] = useState<Set<string>>(new Set());

  useEffect(() => {
    const keyFor = (e: KeyboardEvent): string | null => {
      if (e.key === ' ' || e.code === 'Space') return ' ';
      if (e.key.length === 1 && /[a-z]/i.test(e.key)) return e.key.toLowerCase();
      if (SYMBOL_KEYS.has(e.key)) return e.key;
      return null;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = keyFor(e);
      if (!key) return;
      setPressed(prev => (prev.has(key) ? prev : new Set(prev).add(key)));
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = keyFor(e);
      if (!key) return;
      setPressed(prev => {
        if (!prev.has(key)) return prev;
        const next = new Set(prev);
        next.delete(key);
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

  // Row offsets are computed from a shared key unit (40px key + 8px gap) so
  // each shorter row sits exactly centered under row 1 — which, since each
  // row has exactly one fewer key than the row above, also produces an even
  // q/a/z stagger for free. The spacebar spans from the center of "z" to
  // the center of ",".
  return (
    <div className="flex justify-center select-none">
      <div className="flex flex-col items-start gap-2">
        <div className="flex gap-2">
          {ROW1.map(k => (
            <Key key={k} label={k} pressed={pressed.has(k)} />
          ))}
        </div>
        <div className="flex gap-2 ml-[24px]">
          {ROW2.map(k => (
            <Key key={k} label={k} pressed={pressed.has(k)} />
          ))}
        </div>
        <div className="flex gap-2 ml-[48px]">
          {ROW3.map(k => (
            <Key key={k} label={k} pressed={pressed.has(k)} />
          ))}
        </div>
        <div className="flex gap-2 mt-1 ml-[68px]">
          <Key label="" pressed={pressed.has(' ')} widthClass="w-[336px]" />
        </div>
      </div>
    </div>
  );
}
