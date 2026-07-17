import { useEffect, useMemo } from 'react';
import { useUser } from '../hooks/useUser.js';
import { WEEKLY_TEST_TARGET, WEEKLY_XP_BONUS, weekKey, nextWeeklyReset } from '../utils/weeklyChallenge.js';
import ChallengeCountdown from './ChallengeCountdown.js';

export default function WeeklyChallenge() {
  const { testsThisWeek, weeklyClaimed, claimWeeklyChallengeBonus } = useUser();
  const resetAt = useMemo(() => nextWeeklyReset(), []);

  useEffect(() => {
    if (weeklyClaimed || testsThisWeek < WEEKLY_TEST_TARGET) return;
    void claimWeeklyChallengeBonus(weekKey(), WEEKLY_TEST_TARGET, WEEKLY_XP_BONUS);
  }, [testsThisWeek, weeklyClaimed, claimWeeklyChallengeBonus]);

  const progress = Math.min(100, (testsThisWeek / WEEKLY_TEST_TARGET) * 100);

  return (
    <div
      className={`rounded-lg border px-4 py-3.5 transition-colors ${
        weeklyClaimed ? 'border-[var(--accent)]/40 bg-[var(--accent-soft)]' : 'border-[var(--border)] bg-[var(--surface)]'
      }`}
    >
      <div className="flex items-center gap-3 text-sm mb-2.5">
        <span className="text-[var(--text-secondary)] flex-1 min-w-0">
          weekly challenge — complete <span className="text-[var(--text-correct)] font-semibold tabular-nums">{WEEKLY_TEST_TARGET}</span> tests
        </span>
        <span className={`shrink-0 whitespace-nowrap font-semibold tabular-nums ${weeklyClaimed ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}`}>
          {weeklyClaimed ? 'claimed' : `+${WEEKLY_XP_BONUS} xp`}
        </span>
      </div>
      <div className="w-full bg-[var(--bg-elevated)] rounded-full h-1.5 overflow-hidden">
        <div
          className="h-full bg-[var(--accent)] rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex items-center justify-between mt-1.5">
        <p className="text-xs text-[var(--text-muted)] tabular-nums">
          {Math.min(testsThisWeek, WEEKLY_TEST_TARGET)} / {WEEKLY_TEST_TARGET} this week
        </p>
        <ChallengeCountdown resetAt={resetAt} />
      </div>
    </div>
  );
}
