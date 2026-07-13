import { useEffect } from 'react';
import { useUser } from '../hooks/useUser.js';
import { WEEKLY_TEST_TARGET, WEEKLY_XP_BONUS, weekKey } from '../utils/weeklyChallenge.js';

export default function WeeklyChallenge() {
  const { testsThisWeek, weeklyClaimed, claimWeeklyChallengeBonus } = useUser();

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
        <span className={`w-2 h-2 rounded-full shrink-0 ${weeklyClaimed ? 'bg-[var(--accent)]' : 'bg-[var(--text-muted)]'}`} />
        <span className="text-[var(--text-secondary)]">
          weekly challenge — complete <span className="text-[var(--text-correct)] font-semibold tabular-nums">{WEEKLY_TEST_TARGET}</span> tests
        </span>
        <span className={`ml-auto font-semibold tabular-nums ${weeklyClaimed ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}`}>
          {weeklyClaimed ? 'claimed' : `+${WEEKLY_XP_BONUS} xp`}
        </span>
      </div>
      <div className="w-full bg-[var(--bg-elevated)] rounded-full h-1.5 overflow-hidden">
        <div
          className="h-full bg-[var(--accent)] rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-xs text-[var(--text-muted)] mt-1.5 tabular-nums">
        {Math.min(testsThisWeek, WEEKLY_TEST_TARGET)} / {WEEKLY_TEST_TARGET} this week
      </p>
    </div>
  );
}
