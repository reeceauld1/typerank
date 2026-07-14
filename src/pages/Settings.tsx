import { Link } from 'react-router-dom';
import { useSettings } from '../hooks/useSettings.js';

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

export default function Settings() {
  const { showKeyboard, setShowKeyboard } = useSettings();

  return (
    <div className="flex-1 flex flex-col py-10 px-6">
      <div className="max-w-2xl w-full mx-auto flex items-center justify-between mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--text-correct)]">settings</h1>
        <Link
          to="/"
          className="text-sm border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)] text-[var(--text-secondary)] px-4 py-2 rounded-lg transition-colors"
        >
          back to test
        </Link>
      </div>

      <div className="max-w-2xl w-full mx-auto flex flex-col gap-3">
        <div className="flex items-center justify-between bg-[var(--surface)] border border-[var(--border)] rounded-xl px-6 py-4">
          <div>
            <p className="text-[var(--text-correct)] font-medium">show on-screen keyboard</p>
            <p className="text-[var(--text-muted)] text-sm mt-0.5">
              displays a keyboard beneath the words on the main page that lights up as you type.
            </p>
          </div>
          <Toggle checked={showKeyboard} onChange={setShowKeyboard} />
        </div>
      </div>
    </div>
  );
}
