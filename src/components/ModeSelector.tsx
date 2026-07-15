import { useState } from 'react';
import type { TestConfig, TimeMode, WordMode } from '../types/index.js';
import { WORD_PRESETS, TIME_PRESETS } from '../utils/xp.js';

interface ModeSelectorProps {
  config: TestConfig;
  onChange: (config: TestConfig) => void;
}

const CUSTOM_RANGE: Record<TestConfig['mode'], { min: number; max: number; default: number }> = {
  words: { min: 5, max: 300, default: 100 },
  time: { min: 5, max: 600, default: 90 },
};

function clampCustom(mode: TestConfig['mode'], n: number): number {
  const { min, max, default: fallback } = CUSTOM_RANGE[mode];
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

export default function ModeSelector({ config, onChange }: ModeSelectorProps) {
  const timeModes: TimeMode[] = [10, 30, 60, 'infinite'];
  const wordModes: WordMode[] = [10, 25, 50];

  const isCustom =
    config.mode === 'time'
      ? config.value !== 'infinite' && !TIME_PRESETS.includes(config.value)
      : !WORD_PRESETS.includes(config.value);
  const [customText, setCustomText] = useState(isCustom ? String(config.value) : '');

  const pill = (active: boolean) =>
    `px-3 py-1.5 rounded-md text-sm font-bold transition-colors cursor-pointer ${
      active
        ? 'text-[var(--accent)]'
        : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
    }`;

  const handleCustomClick = () => {
    const fallback = CUSTOM_RANGE[config.mode].default;
    setCustomText(String(fallback));
    onChange({ mode: config.mode, value: fallback } as TestConfig);
  };

  // Committing on every keystroke (rather than just on blur/Enter) would
  // call onChange mid-typing, which bumps Home's remount key for
  // TypingTest — whose mount effect refocuses its own hidden input,
  // stealing focus away from this box after a single digit.
  const handleCustomTextChange = (raw: string) => {
    setCustomText(raw);
  };

  const commitCustom = () => {
    const n = clampCustom(config.mode, Number(customText));
    setCustomText(String(n));
    onChange({ mode: config.mode, value: n } as TestConfig);
  };

  const handleCustomKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.currentTarget.blur();
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 bg-[var(--surface)] border border-[var(--border)] rounded-lg px-2 py-2 text-xs">
      <div className="flex items-center justify-center gap-1">
        <button onClick={() => onChange({ mode: 'time', value: config.mode === 'time' ? config.value : 30 })} className={pill(config.mode === 'time')}>
          time
        </button>
        <button onClick={() => onChange({ mode: 'words', value: config.mode === 'words' ? config.value : 25 })} className={pill(config.mode === 'words')}>
          words
        </button>
      </div>

      <span className="hidden sm:block w-px h-4 bg-[var(--border)] mx-1" />

      <div className="flex items-center justify-center gap-1">
        {config.mode === 'time'
          ? timeModes.map(time => (
              <button key={time} onClick={() => onChange({ mode: 'time', value: time })} className={pill(!isCustom && config.value === time)}>
                {time === 'infinite' ? 'infinite' : time}
              </button>
            ))
          : wordModes.map(words => (
              <button key={words} onClick={() => onChange({ mode: 'words', value: words })} className={pill(!isCustom && config.value === words)}>
                {words}
              </button>
            ))}
        <button onClick={handleCustomClick} className={pill(isCustom)}>
          custom
        </button>
        {isCustom && (
          <input
            type="number"
            min={CUSTOM_RANGE[config.mode].min}
            max={CUSTOM_RANGE[config.mode].max}
            value={customText}
            onChange={e => handleCustomTextChange(e.target.value)}
            onBlur={commitCustom}
            onKeyDown={handleCustomKeyDown}
            autoFocus
            placeholder={config.mode === 'words' ? 'words' : 'seconds'}
            className="w-14 bg-[var(--bg-elevated)] border border-[var(--border)] rounded px-2 py-1 text-[var(--text-correct)] focus:outline-none focus:border-[var(--accent)]"
          />
        )}
      </div>
    </div>
  );
}
