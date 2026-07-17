import { useEffect, useState } from 'react';
import Tooltip from './Tooltip.js';

function formatRemaining(ms: number): string {
  if (ms <= 0) return 'resetting…';
  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `resets in ${days}d ${hours}h`;
  if (hours > 0) return `resets in ${hours}h ${minutes}m`;
  return `resets in ${minutes}m`;
}

// Shared by HourlyChallenge/DailyChallenge/WeeklyChallenge — a live "resets
// in Xh Ym" readout, with the exact reset timestamp/date on hover (via the
// existing Tooltip component) for whoever wants to know precisely rather
// than just "soon".
export default function ChallengeCountdown({ resetAt }: { resetAt: Date }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <Tooltip content={resetAt.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}>
      <span className="text-[11px] text-[var(--text-muted)] tabular-nums cursor-default">
        {formatRemaining(resetAt.getTime() - now)}
      </span>
    </Tooltip>
  );
}
