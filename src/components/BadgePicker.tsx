import { useState } from 'react';
import { useUser } from '../hooks/useUser.js';
import { BADGE_CATALOG } from '../utils/cosmetics.js';
import Tooltip from './Tooltip.js';

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
      <rect x="5" y="11" width="14" height="9" rx="1.5" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

function cellClass(unlocked: boolean, equipped: boolean): string {
  if (equipped) return 'border-[var(--accent)] bg-[var(--accent-soft)]';
  if (unlocked) return 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)] cursor-pointer';
  return 'border-[var(--border)] bg-[var(--surface)] opacity-40 cursor-not-allowed';
}

export default function BadgePicker({ onClose }: { onClose: () => void }) {
  const { stats, setEquippedBadge } = useUser();
  const [error, setError] = useState<string | null>(null);

  const handleEquip = async (id: string | null) => {
    if (id === stats.equippedBadge) return;
    setError(null);
    const ok = await setEquippedBadge(id);
    if (!ok) setError("Couldn't equip that badge - try again.");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6">
      <div className="w-full max-w-md bg-[var(--surface)] border border-[var(--border)] rounded-xl p-8">
        <h2 className="text-lg font-semibold text-[var(--text-correct)] mb-1">badges</h2>
        <p className="text-[var(--text-muted)] text-sm mb-4">Equip a badge to show next to your name.</p>
        {error && <p className="text-[var(--text-incorrect)] text-sm mb-3">{error}</p>}
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <Tooltip content="No badge equipped">
            <button
              type="button"
              onClick={() => void handleEquip(null)}
              className={`relative w-full flex flex-col items-center gap-2 rounded-lg border p-3 sm:p-4 transition-colors ${cellClass(true, !stats.equippedBadge)}`}
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border border-dashed border-[var(--border)]" />
              <span className="flex items-center justify-center h-8 text-xs text-[var(--text-muted)] text-center leading-tight">none</span>
            </button>
          </Tooltip>
          {BADGE_CATALOG.map(badge => {
            const unlocked = badge.isUnlocked(stats);
            const equipped = stats.equippedBadge === badge.id;
            const Icon = badge.icon;
            return (
              <Tooltip key={badge.id} content={unlocked ? `${badge.name} - Unlocked: ${badge.description}` : `${badge.name} - ${badge.description}`}>
                <button
                  type="button"
                  disabled={!unlocked}
                  onClick={() => void handleEquip(badge.id)}
                  className={`relative w-full flex flex-col items-center gap-2 rounded-lg border p-3 sm:p-4 transition-colors ${cellClass(unlocked, equipped)}`}
                >
                  {!unlocked && (
                    <span className="absolute top-1.5 right-1.5 text-[var(--text-muted)]">
                      <LockIcon />
                    </span>
                  )}
                  <div
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center bg-[var(--bg-elevated)]"
                    style={{ color: badge.color }}
                  >
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <span className="flex items-center justify-center h-8 text-xs text-[var(--text-muted)] text-center leading-tight">{badge.name}</span>
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
