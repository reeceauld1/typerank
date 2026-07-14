import type { ReactNode } from 'react';
import type { UserStats } from '../types/index.js';

interface ProgressItem {
  id: string;
  name: string;
  description: string;
  challengeDescription?: string;
  isUnlocked: (stats: UserStats) => boolean;
  progress: (stats: UserStats) => number;
}

interface CosmeticProgressSectionProps<T extends ProgressItem> {
  title: string;
  items: T[];
  stats: UserStats;
  admin?: boolean;
  renderPreview: (item: T, unlocked: boolean) => ReactNode;
}

export default function CosmeticProgressSection<T extends ProgressItem>({
  title,
  items,
  stats,
  admin = false,
  renderPreview,
}: CosmeticProgressSectionProps<T>) {
  const unlockedCount = admin ? items.length : items.filter(item => item.isUnlocked(stats)).length;

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl px-6 py-4">
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="text-[var(--text-correct)] font-medium">{title}</h3>
        <span className="text-xs text-[var(--text-muted)] tabular-nums">
          {unlockedCount} / {items.length} unlocked
        </span>
      </div>
      <div className="flex flex-col gap-3.5">
        {items.map(item => {
          const unlocked = admin || item.isUnlocked(stats);
          const pct = Math.round((admin ? 1 : item.progress(stats)) * 100);
          return (
            <div key={item.id} className="flex flex-col gap-1.5">
              <div className="flex items-center gap-3 text-sm">
                <span className={`font-medium shrink-0 ${unlocked ? 'text-[var(--accent)]' : 'text-[var(--text-correct)]'}`}>
                  {item.name}
                </span>
                <span className="text-[var(--text-muted)] text-xs truncate flex-1">
                  {item.challengeDescription ?? item.description}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-[var(--bg-elevated)] rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      unlocked ? 'bg-[var(--accent)]' : 'bg-[var(--text-muted)]'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span
                  className={`text-xs font-semibold tabular-nums shrink-0 w-[52px] text-center ${
                    unlocked ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'
                  }`}
                >
                  {unlocked ? 'unlocked' : `${pct}%`}
                </span>
                <div className={unlocked ? 'shrink-0' : 'shrink-0 opacity-40'}>{renderPreview(item, unlocked)}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
