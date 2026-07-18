import { useMemo, useState } from 'react';
import { useUser } from '../hooks/useUser.js';
import { nextHourlyReset } from '../utils/hourlyChallenge.js';
import ChallengeCountdown from './ChallengeCountdown.js';
import Tooltip from './Tooltip.js';

export default function HourlyChallenge() {
  const { claimedThisHour, hourlyChallenge, hourlyChallengeTestsThisHour, claimHourlyChallengeBonus } = useUser();
  const resetAt = useMemo(() => nextHourlyReset(), []);
  const [claiming, setClaiming] = useState(false);

  if (!hourlyChallenge) return null;

  const ready = !claimedThisHour && hourlyChallengeTestsThisHour >= hourlyChallenge.testsTarget;
  const label = hourlyChallenge.mode === 'time' ? `${hourlyChallenge.value}s` : `${hourlyChallenge.value} words`;
  const progress = Math.min(100, (hourlyChallengeTestsThisHour / hourlyChallenge.testsTarget) * 100);

  const handleClaim = async () => {
    setClaiming(true);
    await claimHourlyChallengeBonus();
    setClaiming(false);
  };

  return (
    <div
      className={`rounded-lg border px-4 py-3.5 transition-colors ${
        claimedThisHour || ready ? 'border-[var(--accent)]/40 bg-[var(--accent-soft)]' : 'border-[var(--border)] bg-[var(--surface)]'
      }`}
    >
      <div className="flex items-center gap-3 text-sm mb-2.5">
        <span className="text-[var(--text-secondary)] flex-1 min-w-0">
          hourly challenge - complete <span className="text-[var(--text-correct)] font-semibold tabular-nums">{hourlyChallenge.testsTarget}</span>{' '}
          {label} tests
        </span>
        {claimedThisHour ? (
          <Tooltip content={`+${hourlyChallenge.xpBonus} xp claimed`}>
            <span className="shrink-0 whitespace-nowrap font-semibold tabular-nums text-[var(--accent)] cursor-default">claimed</span>
          </Tooltip>
        ) : ready ? (
          <button
            type="button"
            disabled={claiming}
            onClick={() => void handleClaim()}
            className="shrink-0 whitespace-nowrap text-xs bg-[var(--accent)] hover:brightness-110 disabled:opacity-50 text-[var(--bg)] px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer"
          >
            {claiming ? '...' : `claim +${hourlyChallenge.xpBonus} xp`}
          </button>
        ) : (
          <span className="shrink-0 whitespace-nowrap font-semibold tabular-nums text-[var(--text-muted)]">+{hourlyChallenge.xpBonus} xp</span>
        )}
      </div>
      <div className="w-full bg-[var(--bg-elevated)] rounded-full h-1.5 overflow-hidden">
        <div
          className="h-full bg-[var(--accent)] rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex items-center justify-between mt-1.5">
        <p className="text-xs text-[var(--text-muted)] tabular-nums">
          {Math.min(hourlyChallengeTestsThisHour, hourlyChallenge.testsTarget)} / {hourlyChallenge.testsTarget} this hour
        </p>
        <ChallengeCountdown resetAt={resetAt} />
      </div>
    </div>
  );
}
