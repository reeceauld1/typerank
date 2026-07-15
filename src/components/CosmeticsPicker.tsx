import { useState, useEffect, useRef } from 'react';
import type { UserStats } from '../types/index.js';
import { useUser } from '../hooks/useUser.js';
import { useAuth } from '../hooks/useAuth.js';
import { AVATAR_CATALOG, BORDER_CATALOG, NAME_COLOR_CATALOG, isAdminEmail } from '../utils/cosmetics.js';
import { ACCENT_COLOR_CATALOG } from '../utils/accentColors.js';
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
  const { stats: ownStats, setEquippedCosmetics, setEquippedAccentColor, setEquippedNameColor } = useUser();
  const { user } = useAuth();
  const stats = statsOverride ?? ownStats;
  const admin = !readOnly && isAdminEmail(user?.email);
  const [error, setError] = useState<string | null>(null);
  const [pendingCustomHex, setPendingCustomHex] = useState<string | null>(null);
  const confirmBarRef = useRef<HTMLDivElement>(null);
  const wasPendingRef = useRef(false);

  useEffect(() => {
    const isPending = pendingCustomHex !== null;
    // Only scroll on the transition into "pending" — dragging around the
    // color wheel keeps changing pendingCustomHex, and re-triggering the
    // scroll on every one of those restarted the animation each time,
    // which is what made it look instant instead of smooth.
    if (isPending && !wasPendingRef.current) {
      const el = confirmBarRef.current;
      const overflowBelow = el ? el.getBoundingClientRect().bottom - window.innerHeight : 0;
      if (overflowBelow > 0) {
        window.scrollBy({ top: overflowBelow + 10, behavior: 'smooth' });
      }
    }
    wasPendingRef.current = isPending;
  }, [pendingCustomHex]);

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

  const handleEquipColor = async (id: string) => {
    if (readOnly || id === stats.equippedAccentColor) return;
    setError(null);
    const ok = await setEquippedAccentColor(id);
    if (!ok) setError("Couldn't equip that color — try again.");
  };

  const handleEquipNameColor = async (id: string) => {
    if (readOnly || id === stats.equippedNameColor) return;
    setError(null);
    const ok = await setEquippedNameColor(id);
    if (!ok) setError("Couldn't equip that name color — try again.");
  };

  // Picking is local-only until confirmed — the native color input fires
  // onChange continuously while dragging around the color wheel, and
  // calling setEquippedAccentColor (an RPC + full stats refresh) on every
  // one of those was flooding the site with requests.
  const handlePickCustomColor = (hex: string) => setPendingCustomHex(hex);

  const handleConfirmCustomColor = async () => {
    if (readOnly || !pendingCustomHex) return;
    setError(null);
    const ok = await setEquippedAccentColor('custom', pendingCustomHex);
    if (!ok) setError("Couldn't equip that color — try again.");
    setPendingCustomHex(null);
  };

  const handleCancelCustomColor = () => setPendingCustomHex(null);

  const unlockedAvatars = admin ? AVATAR_CATALOG.length : AVATAR_CATALOG.filter(a => a.isUnlocked(stats)).length;
  const unlockedBorders = admin ? BORDER_CATALOG.length : BORDER_CATALOG.filter(b => b.isUnlocked(stats)).length;
  const unlockedColors = admin ? ACCENT_COLOR_CATALOG.length : ACCENT_COLOR_CATALOG.filter(c => c.isUnlocked(stats)).length;
  const unlockedNameColors = admin ? NAME_COLOR_CATALOG.length : NAME_COLOR_CATALOG.filter(c => c.isUnlocked(stats)).length;

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
        <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-8 gap-3">
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
        <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-8 gap-3">
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
                  <div className={`relative rounded-full ${border.id === 'legend' ? 'legend-glow-wrapper' : ''}`}>
                    <div className={`w-10 h-10 border-2 rounded-full bg-[var(--bg-elevated)] ${border.className}`} />
                  </div>
                  <span className="text-[10px] text-[var(--text-muted)] text-center leading-tight">{border.name}</span>
                </button>
              </Tooltip>
            );
          })}
        </div>
      </section>

      <section>
        <div className="flex items-baseline justify-between mb-3">
          <h3 className="text-lg font-semibold text-[var(--text-correct)]">name colors</h3>
          <span className="text-xs text-[var(--text-muted)] tabular-nums">
            {unlockedNameColors} / {NAME_COLOR_CATALOG.length} unlocked
          </span>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-8 gap-3">
          {NAME_COLOR_CATALOG.map(color => {
            const unlocked = admin || color.isUnlocked(stats);
            const equipped = stats.equippedNameColor === color.id;
            return (
              <Tooltip key={color.id} content={unlocked ? `${color.name} — Unlocked: ${color.description}` : `${color.name} — ${color.description}`}>
                <button
                  type="button"
                  disabled={!unlocked || readOnly}
                  onClick={() => void handleEquipNameColor(color.id)}
                  className={`relative w-full flex flex-col items-center gap-1.5 rounded-lg border p-3 transition-colors ${cellClass(unlocked, equipped, readOnly)}`}
                >
                  {!unlocked && (
                    <span className="absolute top-1.5 right-1.5 text-[var(--text-muted)]">
                      <LockIcon />
                    </span>
                  )}
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[var(--bg-elevated)]">
                    <span className={`text-sm font-bold ${color.className}`}>Aa</span>
                  </div>
                  <span className="text-[10px] text-[var(--text-muted)] text-center leading-tight">{color.name}</span>
                </button>
              </Tooltip>
            );
          })}
        </div>
      </section>

      <section>
        <div className="flex items-baseline justify-between mb-3">
          <h3 className="text-lg font-semibold text-[var(--text-correct)]">accent color</h3>
          <span className="text-xs text-[var(--text-muted)] tabular-nums">
            {unlockedColors} / {ACCENT_COLOR_CATALOG.length} unlocked
          </span>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-8 gap-3">
          {ACCENT_COLOR_CATALOG.map(color => {
            const unlocked = admin || color.isUnlocked(stats);
            const equipped = stats.equippedAccentColor === color.id;
            const tooltipContent = unlocked
              ? `${color.name} — Unlocked: ${color.description}`
              : `${color.name} — ${color.description}`;

            if (color.id === 'custom') {
              const swatchHex = pendingCustomHex ?? stats.customAccentHex ?? color.hex;
              return (
                <Tooltip key={color.id} content={tooltipContent}>
                  <label
                    className={`relative w-full flex flex-col items-center gap-1.5 rounded-lg border p-3 transition-colors ${cellClass(unlocked, equipped, readOnly)}`}
                  >
                    {!unlocked && (
                      <span className="absolute top-1.5 right-1.5 text-[var(--text-muted)]">
                        <LockIcon />
                      </span>
                    )}
                    <input
                      type="color"
                      value={swatchHex}
                      disabled={!unlocked || readOnly}
                      onChange={e => handlePickCustomColor(e.target.value)}
                      className="sr-only"
                    />
                    <div
                      className="w-10 h-10 rounded-full border-2 border-[var(--border)]"
                      style={{ backgroundColor: unlocked ? swatchHex : 'var(--bg-elevated)' }}
                    />
                    <span className="text-[10px] text-[var(--text-muted)] text-center leading-tight">{color.name}</span>
                  </label>
                </Tooltip>
              );
            }

            return (
              <Tooltip key={color.id} content={tooltipContent}>
                <button
                  type="button"
                  disabled={!unlocked || readOnly}
                  onClick={() => void handleEquipColor(color.id)}
                  className={`relative w-full flex flex-col items-center gap-1.5 rounded-lg border p-3 transition-colors ${cellClass(unlocked, equipped, readOnly)}`}
                >
                  {!unlocked && (
                    <span className="absolute top-1.5 right-1.5 text-[var(--text-muted)]">
                      <LockIcon />
                    </span>
                  )}
                  <div
                    className="w-10 h-10 rounded-full border-2 border-[var(--border)]"
                    style={
                      color.id === 'monochrome'
                        ? { background: 'linear-gradient(135deg, #000 50%, #fff 50%)' }
                        : { backgroundColor: color.hex }
                    }
                  />
                  <span className="text-[10px] text-[var(--text-muted)] text-center leading-tight">{color.name}</span>
                </button>
              </Tooltip>
            );
          })}
        </div>

        {pendingCustomHex && (
          <div ref={confirmBarRef} className="mt-3 flex items-center gap-3 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg px-4 py-3">
            <div
              className="w-6 h-6 rounded-full border-2 border-[var(--border)] shrink-0"
              style={{ backgroundColor: pendingCustomHex }}
            />
            <span className="text-sm text-[var(--text-secondary)] flex-1">use this custom color?</span>
            <button
              type="button"
              onClick={() => void handleConfirmCustomColor()}
              className="text-sm border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent-soft)] px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              confirm
            </button>
            <button
              type="button"
              onClick={handleCancelCustomColor}
              className="text-sm border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)] px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              cancel
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
