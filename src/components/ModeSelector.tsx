import type { TestConfig, TimeMode, WordMode } from '../types/index.js';

interface ModeSelectorProps {
  config: TestConfig;
  onChange: (config: TestConfig) => void;
}

export default function ModeSelector({ config, onChange }: ModeSelectorProps) {
  const timeModes: TimeMode[] = [10, 30, 60, 'infinite'];
  const wordModes: WordMode[] = [10, 25, 50];

  const pill = (active: boolean) =>
    `px-3 py-1.5 rounded-md text-sm font-bold transition-colors ${
      active
        ? 'text-[var(--accent)]'
        : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
    }`;

  return (
    <div className="flex items-center gap-1 bg-[var(--surface)] border border-[var(--border)] rounded-lg px-2 py-2 text-xs">
      <button onClick={() => onChange({ mode: 'time', value: config.mode === 'time' ? config.value : 30 })} className={pill(config.mode === 'time')}>
        time
      </button>
      <button onClick={() => onChange({ mode: 'words', value: config.mode === 'words' ? config.value : 25 })} className={pill(config.mode === 'words')}>
        words
      </button>

      <span className="w-px h-4 bg-[var(--border)] mx-1" />

      {config.mode === 'time'
        ? timeModes.map(time => (
            <button key={time} onClick={() => onChange({ mode: 'time', value: time })} className={pill(config.value === time)}>
              {time === 'infinite' ? 'infinite' : time}
            </button>
          ))
        : wordModes.map(words => (
            <button key={words} onClick={() => onChange({ mode: 'words', value: words })} className={pill(config.value === words)}>
              {words}
            </button>
          ))}
    </div>
  );
}
