import { Link } from 'react-router-dom';
import { useSettings } from '../hooks/useSettings.js';
import { KEYBOARD_LAYOUT_OPTIONS } from '../utils/keyboardLayouts.js';
import { FONT_OPTIONS } from '../utils/fonts.js';
import { WORD_LIST_OPTIONS } from '../utils/words.js';
import type { SpaceStyle } from '../context/SettingsContextBase.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';

function Toggle({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer shrink-0 ${
        checked ? 'bg-[var(--accent)]' : 'bg-[var(--bg-elevated)] border border-[var(--border)]'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-[var(--bg)] transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

const THEME_OPTIONS: { id: 'system' | 'light' | 'dark'; label: string }[] = [
  { id: 'system', label: 'System' },
  { id: 'dark', label: 'Dark' },
  { id: 'light', label: 'Light' },
];

const SPACE_STYLE_OPTIONS: { id: SpaceStyle; label: string }[] = [
  { id: 'space', label: 'Space' },
  { id: 'underscore', label: 'Underscore' },
  { id: 'dot', label: 'Dot' },
];

export default function Settings() {
  useDocumentTitle('settings');
  const {
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
    wordListSize,
    setWordListSize,
  } = useSettings();

  return (
    <div className="flex-1 flex flex-col py-10 px-6">
      <div className="max-w-4xl w-full mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-8">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--text-correct)]">settings</h1>
        <Link
          to="/"
          className="text-sm border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)] text-[var(--text-secondary)] px-4 py-2 rounded-lg transition-colors"
        >
          back to test
        </Link>
      </div>

      <div className="max-w-4xl w-full mx-auto flex flex-col gap-3">
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl px-6 py-4">
          <p className="text-[var(--text-correct)] font-medium">theme</p>
          <p className="text-[var(--text-muted)] text-sm mt-0.5 mb-4">
            "system" (default) follows your browser/OS setting, and switches automatically if that changes.
          </p>
          <div className="flex flex-wrap items-center gap-1 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg p-1 text-sm w-fit">
            {THEME_OPTIONS.map(option => (
              <button
                key={option.id}
                onClick={() => setTheme(option.id)}
                className={`px-4 py-2 rounded-md font-medium transition-colors cursor-pointer ${
                  theme === option.id
                    ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="hidden sm:flex items-center justify-between bg-[var(--surface)] border border-[var(--border)] rounded-xl px-6 py-4">
          <div>
            <p className="text-[var(--text-correct)] font-medium">show on-screen keyboard</p>
            <p className="text-[var(--text-muted)] text-sm mt-0.5">
              displays a keyboard beneath the words on the main page that lights up as you type.
            </p>
          </div>
          <Toggle checked={showKeyboard} onChange={setShowKeyboard} />
        </div>

        <div className="hidden sm:block bg-[var(--surface)] border border-[var(--border)] rounded-xl px-6 py-4">
          <p className="text-[var(--text-correct)] font-medium">keyboard layout</p>
          <p className="text-[var(--text-muted)] text-sm mt-0.5 mb-4">
            changes what letter each physical key types — practice an alternate layout without changing your OS's own
            keyboard settings.
          </p>
          <div className="flex flex-wrap items-center gap-1 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg p-1 text-sm w-fit">
            {KEYBOARD_LAYOUT_OPTIONS.map(option => (
              <button
                key={option.id}
                onClick={() => setKeyboardLayout(option.id)}
                className={`px-4 py-2 rounded-md font-medium transition-colors cursor-pointer ${
                  keyboardLayout === option.id
                    ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl px-6 py-4">
          <p className="text-[var(--text-correct)] font-medium">space style</p>
          <p className="text-[var(--text-muted)] text-sm mt-0.5 mb-4">
            changes how the space between words is shown on the typing screen.
          </p>
          <div className="flex flex-wrap items-center gap-1 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg p-1 text-sm w-fit">
            {SPACE_STYLE_OPTIONS.map(option => (
              <button
                key={option.id}
                onClick={() => setSpaceStyle(option.id)}
                className={`px-4 py-2 rounded-md font-medium transition-colors cursor-pointer ${
                  spaceStyle === option.id
                    ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl px-6 py-4">
          <p className="text-[var(--text-correct)] font-medium">word list</p>
          <p className="text-[var(--text-muted)] text-sm mt-0.5 mb-4">
            how many distinct words to draw from during tests — a larger list means more variety and fewer repeats.
          </p>
          <div className="flex flex-wrap items-center gap-1 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg p-1 text-sm w-fit">
            {WORD_LIST_OPTIONS.map(option => (
              <button
                key={option.id}
                onClick={() => setWordListSize(option.id)}
                className={`px-4 py-2 rounded-md font-medium transition-colors cursor-pointer ${
                  wordListSize === option.id
                    ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl px-6 py-4">
          <p className="text-[var(--text-correct)] font-medium">font</p>
          <p className="text-[var(--text-muted)] text-sm mt-0.5 mb-4">changes the font used across the whole site.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {FONT_OPTIONS.map(option => (
              <button
                key={option.id}
                type="button"
                onClick={() => setFont(option.id)}
                style={{ fontFamily: option.family }}
                className={`rounded-lg border px-3 py-4 text-sm text-center transition-colors cursor-pointer ${
                  font === option.id
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                    : 'border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-correct)] hover:border-[var(--accent)]'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <p className="text-center text-xs text-[var(--text-muted)] mt-2">created by yvern</p>
      </div>
    </div>
  );
}
