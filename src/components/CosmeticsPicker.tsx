import { useState } from 'react';
import type { UserStats } from '../types/index.js';
import { useUser } from '../hooks/useUser.js';
import { useAuth } from '../hooks/useAuth.js';
import { AVATAR_CATALOG, BORDER_CATALOG, isAdminEmail } from '../utils/cosmetics.js';
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
  if (equipped) return 'border-[var(--accent)] bg-[var(--accent-soft)]';
  if (unlocked) {
    return readOnly
      ? 'border-[var(--border)] bg-[var(--surface)]'
      : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)] cursor-pointer';
  }
  return 'border-[var(--border)] bg-[var(--surface)] opacity-40 cursor-not-allowed';
}

interface CosmeticsPickerProps {
  statsOverride?: UserStats;
  readOnly?: boolean;
}

export default function CosmeticsPicker({ statsOverride, readOnly = false }: CosmeticsPickerProps = {}) {
  const { stats: ownStats, setEquippedCosmetics } = useUser();
  const { user } = useAuth();
  const stats = statsOverride ?? ownStats;
  const admin = !readOnly && isAdminEmail(user?.email);
  const [error, setError] = useState<string | null>(null);

  const handleEquipAvatar = async (id: string) => {
    if (readOnly || id === stats.equippedAvatar) return;
    setError(null);
    const ok = await setEquippedCosmetics(id, stats.equippedBorder);
    if (!ok) setError("Couldn't equip that avatar — try again.");
  };

  const handleEquipBorder = async (id: string) => {
    if (readOnly || id === stats.equippedBorder) return;
    setError(null);
    const ok = await setEquippedCosmetics(stats.equippedAvatar, id);
    if (!ok) setError("Couldn't equip that border — try again.");
  };

  const unlockedAvatars = admin ? AVATAR_CATALOG.length : AVATAR_CATALOG.filter(a => a.isUnlocked(stats)).length;
  const unlockedBorders = admin ? BORDER_CATALOG.length : BORDER_CATALOG.filter(b => b.isUnlocked(stats)).length;

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-8">
      {error && <p className="text-[var(--text-incorrect)] text-sm">{error}</p>}

      <section>
        <div className="flex items-baseline justify-between mb-3">
          <h3 className="text-lg font-semibold text-[var(--text-correct)]">avatars</h3>
          <span className="text-xs text-[var(--text-muted)] tabular-nums">
            {unlockedAvatars} / {AVATAR_CATALOG.length} unlocked
          </span>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
          {AVATAR_CATALOG.map(avatar => {
            const unlocked = admin || avatar.isUnlocked(stats);
            const equipped = stats.equippedAvatar === avatar.id;
            const Icon = avatar.icon;
            return (
              <Tooltip key={avatar.id} content={unlocked ? `${avatar.name} — Unlocked: ${avatar.description}` : `${avatar.name} — ${avatar.description}`}>
                <button
                  type="button"
                  disabled={!unlocked || readOnly}
                  onClick={() => void handleEquipAvatar(avatar.id)}
                  className={`relative w-full flex flex-col items-center gap-1.5 rounded-lg border p-3 transition-colors ${cellClass(unlocked, equipped, readOnly)}`}
                >
                  {!unlocked && (
                    <span className="absolute top-1.5 right-1.5 text-[var(--text-muted)]">
                      <LockIcon />
                    </span>
                  )}
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[var(--bg-elevated)] text-[var(--text-correct)]">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] text-[var(--text-muted)] text-center leading-tight">{avatar.name}</span>
                </button>
              </Tooltip>
            );
          })}
        </div>
      </section>

      <section>
        <div className="flex items-baseline justify-between mb-3">
          <h3 className="text-lg font-semibold text-[var(--text-correct)]">borders</h3>
          <span className="text-xs text-[var(--text-muted)] tabular-nums">
            {unlockedBorders} / {BORDER_CATALOG.length} unlocked
          </span>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
          {BORDER_CATALOG.map(border => {
            const unlocked = admin || border.isUnlocked(stats);
            const equipped = stats.equippedBorder === border.id;
            return (
              <Tooltip key={border.id} content={unlocked ? `${border.name} — Unlocked: ${border.description}` : `${border.name} — ${border.description}`}>
                <button
                  type="button"
                  disabled={!unlocked || readOnly}
                  onClick={() => void handleEquipBorder(border.id)}
                  className={`relative w-full flex flex-col items-center gap-1.5 rounded-lg border p-3 transition-colors ${cellClass(unlocked, equipped, readOnly)}`}
                >
                  {!unlocked && (
                    <span className="absolute top-1.5 right-1.5 text-[var(--text-muted)]">
                      <LockIcon />
                    </span>
                  )}
                  <div className={`w-10 h-10 border-2 rounded-full bg-[var(--bg-elevated)] ${border.className}`} />
                  <span className="text-[10px] text-[var(--text-muted)] text-center leading-tight">{border.name}</span>
                </button>
              </Tooltip>
            );
          })}
        </div>
      </section>
    </div>
  );
}
