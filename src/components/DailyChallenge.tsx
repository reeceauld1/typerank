import { useEffect } from 'react';
import { useUser } from '../hooks/useUser.js';

export default function DailyChallenge() {
  const { claimedToday, dailyChallenge, dailyChallengeTestsToday, claimDailyChallengeBonus } = useUser();

  useEffect(() => {
    if (!dailyChallenge || claimedToday || dailyChallengeTestsToday < dailyChallenge.testsTarget) return;
    void claimDailyChallengeBonus();
  }, [dailyChallenge, claimedToday, dailyChallengeTestsToday, claimDailyChallengeBonus]);

  if (!dailyChallenge) return null;

  const label = dailyChallenge.mode === 'time' ? `${dailyChallenge.value}s` : `${dailyChallenge.value} words`;
  const progress = Math.min(100, (dailyChallengeTestsToday / dailyChallenge.testsTarget) * 100);

  return (
    <div
      className={`rounded-lg border px-4 py-3.5 transition-colors ${
        claimedToday ? 'border-[var(--accent)]/40 bg-[var(--accent-soft)]' : 'border-[var(--border)] bg-[var(--surface)]'
      }`}
    >
      <div className="flex items-center gap-3 text-sm mb-2.5">
        <span className="text-[var(--text-secondary)]">
          daily challenge — complete <span className="text-[var(--text-correct)] font-semibold tabular-nums">{dailyChallenge.testsTarget}</span>{' '}
          {label} tests
        </span>
        <span className={`ml-auto font-semibold tabular-nums ${claimedToday ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}`}>
          {claimedToday ? 'claimed' : `+${dailyChallenge.xpBonus} xp`}
        </span>
      </div>
      <div className="w-full bg-[var(--bg-elevated)] rounded-full h-1.5 overflow-hidden">
        <div
          className="h-full bg-[var(--accent)] rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-xs text-[var(--text-muted)] mt-1.5 tabular-nums">
        {Math.min(dailyChallengeTestsToday, dailyChallenge.testsTarget)} / {dailyChallenge.testsTarget} today
      </p>
    </div>
  );
}
