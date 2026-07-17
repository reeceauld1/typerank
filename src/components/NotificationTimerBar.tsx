import { useEffect, useState } from 'react';

interface NotificationTimerBarProps {
  createdAt: string;
  durationMs: number;
  onExpire: () => void;
}

// A shrinking accent-color bar + mm:ss countdown, shared by the duel
// notification cards (SentDuelInviteNotifications, IncomingDuelInviteNotifications,
// ActiveDuelPresence) — each one calls onExpire once time runs out, doing
// whatever "this is now stale" means for that card (auto-cancel, auto-expire,
// or just stop showing it).
export default function NotificationTimerBar({ createdAt, durationMs, onExpire }: NotificationTimerBarProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const remainingMs = Math.max(0, durationMs - (now - new Date(createdAt).getTime()));
  const expired = remainingMs <= 0;

  useEffect(() => {
    if (expired) onExpire();
    // Only re-checks when expired itself flips - onExpire is a fresh
    // function identity every render and isn't meant to re-trigger this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expired]);

  const totalSeconds = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return (
    <div className="mt-2">
      <div className="flex items-center justify-end mb-1">
        <span className="text-[10px] tabular-nums text-[var(--text-muted)]">
          {minutes}:{String(seconds).padStart(2, '0')}
        </span>
      </div>
      <div className="h-1 w-full rounded-full bg-[var(--bg-elevated)] overflow-hidden">
        <div
          className="h-full bg-[var(--accent)] transition-[width] duration-1000 ease-linear"
          style={{ width: `${(remainingMs / durationMs) * 100}%` }}
        />
      </div>
    </div>
  );
}
