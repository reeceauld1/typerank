import { useUser } from '../hooks/useUser.js';
import { AVATAR_CATALOG, BORDER_CATALOG } from '../utils/cosmetics.js';

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

export default function CosmeticsPicker() {
  const { stats, setEquippedCosmetics } = useUser();

  const handleEquipAvatar = (id: string) => {
    if (id === stats.equippedAvatar) return;
    void setEquippedCosmetics(id, stats.equippedBorder);
  };

  const handleEquipBorder = (id: string) => {
    if (id === stats.equippedBorder) return;
    void setEquippedCosmetics(stats.equippedAvatar, id);
  };

  const unlockedAvatars = AVATAR_CATALOG.filter(a => a.isUnlocked(stats)).length;
  const unlockedBorders = BORDER_CATALOG.filter(b => b.isUnlocked(stats)).length;

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-8">
      <section>
        <div className="flex items-baseline justify-between mb-3">
          <h3 className="text-lg font-semibold text-[var(--text-correct)]">avatars</h3>
          <span className="text-xs text-[var(--text-muted)] tabular-nums">
            {unlockedAvatars} / {AVATAR_CATALOG.length} unlocked
          </span>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
          {AVATAR_CATALOG.map(avatar => {
            const unlocked = avatar.isUnlocked(stats);
            const equipped = stats.equippedAvatar === avatar.id;
            const Icon = avatar.icon;
            return (
              <button
                key={avatar.id}
                type="button"
                disabled={!unlocked}
                onClick={() => handleEquipAvatar(avatar.id)}
                title={unlocked ? avatar.name : `${avatar.name} — ${avatar.description}`}
                className={`relative flex flex-col items-center gap-1.5 rounded-lg border p-3 transition-colors ${cellClass(unlocked, equipped)}`}
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
            const unlocked = border.isUnlocked(stats);
            const equipped = stats.equippedBorder === border.id;
            return (
              <button
                key={border.id}
                type="button"
                disabled={!unlocked}
                onClick={() => handleEquipBorder(border.id)}
                title={unlocked ? border.name : `${border.name} — ${border.description}`}
                className={`relative flex flex-col items-center gap-1.5 rounded-lg border p-3 transition-colors ${cellClass(unlocked, equipped)}`}
              >
                {!unlocked && (
                  <span className="absolute top-1.5 right-1.5 text-[var(--text-muted)]">
                    <LockIcon />
                  </span>
                )}
                <div className={`w-10 h-10 border-2 rounded-full bg-[var(--bg-elevated)] ${border.className}`} />
                <span className="text-[10px] text-[var(--text-muted)] text-center leading-tight">{border.name}</span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
