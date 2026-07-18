import { useEffect, useRef, useState } from 'react';
import { useUser } from '../hooks/useUser.js';
import { useReadyChallenges } from '../hooks/useReadyChallenges.js';
import { hourKey, nextHourlyReset } from '../utils/hourlyChallenge.js';
import { todayKey, nextDailyReset } from '../utils/dailyChallenge.js';
import { WEEKLY_TEST_TARGET, WEEKLY_XP_BONUS, weekKey, nextWeeklyReset } from '../utils/weeklyChallenge.js';
import NotificationTimerBar from './NotificationTimerBar.js';

// How long before a challenge period's own reset boundary to force an
// auto-claim, so it lands safely inside the period the claim RPCs validate
// server-side (date_trunc('hour'/current_date/week, now())) — landing even
// a moment *after* the real boundary would have the server see it as a
// claim against the new, not-yet-qualifying period and reject it.
const AUTO_CLAIM_SAFETY_MARGIN_MS = 5000;

// The toast itself only stays up for this long — dismissing it doesn't
// touch the underlying claim (still sitting there ready, still shown with
// a claim button on /challenges, and still covered by the period-end
// auto-claim below) — it's just the notification popup that shouldn't
// linger on screen forever once you've seen it.
const NOTIFICATION_DISPLAY_MS = 10_000;

// Schedules a single precise timeout (not a poll) for whenever `ready`
// turns true, rather than re-checking on an interval — claimRef keeps the
// eventual call reading the *latest* claim function even though the timer
// itself can be scheduled up to a week out (weekly challenges), without
// tearing down and rebuilding the timeout on every render along the way.
function useAutoClaim(ready: boolean, resetAt: Date, claim: () => void) {
  const claimRef = useRef(claim);
  useEffect(() => {
    claimRef.current = claim;
  });

  useEffect(() => {
    if (!ready) return;
    const delay = Math.max(0, resetAt.getTime() - Date.now() - AUTO_CLAIM_SAFETY_MARGIN_MS);
    const timer = setTimeout(() => claimRef.current(), delay);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, resetAt.getTime()]);
}

// Tracks when *this specific period's* challenge first became ready (for
// the 10s display timer) and whether its toast has already been dismissed
// — keyed by periodKey (hour/day/week) rather than a plain boolean, so a
// fresh period becoming ready again reopens the notification instead of
// staying permanently dismissed from a previous one.
function usePeriodNotification(ready: boolean, periodKey: string) {
  const [shown, setShown] = useState<{ key: string; at: string } | null>(null);
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);

  // Adjusting state during render (not in an effect) for a derived "did the
  // key I care about change" transition — React's own recommended pattern
  // for this: it re-renders immediately with the corrected state before
  // anything commits to the screen, rather than committing a stale frame
  // first and fixing it up a tick later the way an effect would.
  if (ready && shown?.key !== periodKey) {
    setShown({ key: periodKey, at: new Date().toISOString() });
  } else if (!ready && shown !== null) {
    setShown(null);
  }

  return {
    visible: ready && shown?.key === periodKey && dismissedKey !== periodKey,
    shownAt: shown?.at ?? null,
    dismiss: () => setDismissedKey(periodKey),
  };
}

function ClaimCard({
  label,
  xpBonus,
  claiming,
  onClaim,
  shownAt,
  onDismiss,
}: {
  label: string;
  xpBonus: number;
  claiming: boolean;
  onClaim: () => void;
  shownAt: string;
  onDismiss: () => void;
}) {
  return (
    <div className="pointer-events-auto w-full sm:w-72 border border-[var(--accent)]/40 bg-[var(--accent-soft)] rounded-xl px-4 py-3 shadow-lg">
      <p className="text-sm text-[var(--text-correct)]">{label} complete!</p>
      <button
        type="button"
        disabled={claiming}
        onClick={onClaim}
        className="mt-2 text-xs bg-[var(--accent)] hover:brightness-110 disabled:opacity-50 text-[var(--bg)] px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer"
      >
        {claiming ? '...' : `claim +${xpBonus} xp`}
      </button>
      <NotificationTimerBar createdAt={shownAt} durationMs={NOTIFICATION_DISPLAY_MS} onExpire={onDismiss} />
    </div>
  );
}

// Hourly/daily/weekly challenges used to auto-claim themselves the instant
// the test count hit target, entirely silently — the little "+X xp" popup
// (Navbar.tsx, driven by lastXpGained) fired, but nothing told you *why*
// unless you happened to be looking at /challenges when it happened. This
// surfaces "X complete!" as a real notification the moment it happens,
// wherever you are on the site, with a claim button that fires that same
// popup on click — and still auto-claims (same RPCs, same popup) right
// before the period resets if it's never manually claimed.
export default function ChallengeClaimNotifications() {
  const { hourlyChallenge, claimHourlyChallengeBonus, dailyChallenge, claimDailyChallengeBonus, claimWeeklyChallengeBonus } = useUser();
  const { hourlyReady, dailyReady, weeklyReady } = useReadyChallenges();

  const [claimingHourly, setClaimingHourly] = useState(false);
  const [claimingDaily, setClaimingDaily] = useState(false);
  const [claimingWeekly, setClaimingWeekly] = useState(false);

  const hourly = usePeriodNotification(hourlyReady, hourKey());
  const daily = usePeriodNotification(dailyReady, todayKey());
  const weekly = usePeriodNotification(weeklyReady, weekKey());

  const handleClaimHourly = async () => {
    setClaimingHourly(true);
    await claimHourlyChallengeBonus();
    setClaimingHourly(false);
  };
  const handleClaimDaily = async () => {
    setClaimingDaily(true);
    await claimDailyChallengeBonus();
    setClaimingDaily(false);
  };
  const handleClaimWeekly = async () => {
    setClaimingWeekly(true);
    await claimWeeklyChallengeBonus(weekKey(), WEEKLY_TEST_TARGET, WEEKLY_XP_BONUS);
    setClaimingWeekly(false);
  };

  useAutoClaim(hourlyReady, nextHourlyReset(), () => void handleClaimHourly());
  useAutoClaim(dailyReady, nextDailyReset(), () => void handleClaimDaily());
  useAutoClaim(weeklyReady, nextWeeklyReset(), () => void handleClaimWeekly());

  if (!hourly.visible && !daily.visible && !weekly.visible) return null;

  return (
    <>
      {hourly.visible && hourlyChallenge && hourly.shownAt && (
        <ClaimCard
          label="Hourly challenge"
          xpBonus={hourlyChallenge.xpBonus}
          claiming={claimingHourly}
          onClaim={() => void handleClaimHourly()}
          shownAt={hourly.shownAt}
          onDismiss={hourly.dismiss}
        />
      )}
      {daily.visible && dailyChallenge && daily.shownAt && (
        <ClaimCard
          label="Daily challenge"
          xpBonus={dailyChallenge.xpBonus}
          claiming={claimingDaily}
          onClaim={() => void handleClaimDaily()}
          shownAt={daily.shownAt}
          onDismiss={daily.dismiss}
        />
      )}
      {weekly.visible && weekly.shownAt && (
        <ClaimCard
          label="Weekly challenge"
          xpBonus={WEEKLY_XP_BONUS}
          claiming={claimingWeekly}
          onClaim={() => void handleClaimWeekly()}
          shownAt={weekly.shownAt}
          onDismiss={weekly.dismiss}
        />
      )}
    </>
  );
}
