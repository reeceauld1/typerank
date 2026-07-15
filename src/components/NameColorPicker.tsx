import { useState } from 'react';
import { useUser } from '../hooks/useUser.js';
import { useAuth } from '../hooks/useAuth.js';
import { NAME_COLOR_CATALOG, isAdminEmail } from '../utils/cosmetics.js';
import Tooltip from './Tooltip.js';

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
      <rect x="5" y="11" width="14" height="9" rx="1.5" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

function cellClass(unlocked: boolean, equipped: boolean, readOnly: boolean): string {
  if (readOnly) return 'border-[var(--border)] bg-[var(--surface)] cursor-not-allowed';
  if (equipped) return 'border-[var(--accent)] bg-[var(--accent-soft)]';
  if (unlocked) return 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)] cursor-pointer';
  return 'border-[var(--border)] bg-[var(--surface)] opacity-40 cursor-not-allowed';
}

interface NameColorPickerProps {
  onClose: () => void;
  // Showcase mode (used on the Ranked page) — every color renders at full
  // color as if unlocked, so it works as a preview of what's earnable, but
  // clicking is disabled (cursor-not-allowed) since this isn't the place to
  // actually equip one. The real picker (Profile page) leaves this off.
  readOnly?: boolean;
}

export default function NameColorPicker({ onClose, readOnly = false }: NameColorPickerProps) {
  const { stats, setEquippedNameColor } = useUser();
  const { user } = useAuth();
  const admin = !readOnly && isAdminEmail(user?.email);
  const [error, setError] = useState<string | null>(null);

  const handleEquip = async (id: string) => {
    if (readOnly || id === stats.equippedNameColor) return;
    setError(null);
    const ok = await setEquippedNameColor(id);
    if (!ok) setError("Couldn't equip that color — try again.");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6">
      <div className="w-full max-w-sm bg-[var(--surface)] border border-[var(--border)] rounded-xl p-8">
        <h2 className="text-lg font-semibold text-[var(--text-correct)] mb-1">name color</h2>
        <p className="text-[var(--text-muted)] text-sm mb-4">Unlocked by reaching ranked tiers.</p>
        {error && <p className="text-[var(--text-incorrect)] text-sm mb-3">{error}</p>}
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-3 mb-6">
          {NAME_COLOR_CATALOG.map(color => {
            const unlocked = readOnly || admin || color.isUnlocked(stats);
            const equipped = !readOnly && stats.equippedNameColor === color.id;
            return (
              <Tooltip
                key={color.id}
                content={
                  readOnly
                    ? `${color.name} — ${color.description}`
                    : unlocked
                      ? `${color.name} — Unlocked: ${color.description}`
                      : `${color.name} — ${color.description}`
                }
              >
                <button
                  type="button"
                  disabled={readOnly || !unlocked}
                  onClick={() => void handleEquip(color.id)}
                  className={`relative w-full flex flex-col items-center gap-1.5 rounded-lg border p-2 sm:p-3 transition-colors ${cellClass(unlocked, equipped, readOnly)}`}
                >
                  {!readOnly && !unlocked && (
                    <span className="absolute top-1.5 right-1.5 text-[var(--text-muted)]">
                      <LockIcon />
                    </span>
                  )}
                  <span className={`text-sm font-semibold ${color.className}`}>Aa</span>
                  <span className="text-[10px] text-[var(--text-muted)] text-center leading-tight">{color.name}</span>
                </button>
              </Tooltip>
            );
          })}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-full text-sm border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)] text-[var(--text-secondary)] px-4 py-2.5 rounded-lg transition-colors cursor-pointer"
        >
          close
        </button>
      </div>
    </div>
  );
}
