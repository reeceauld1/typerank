import { useUser } from './useUser.js';
import { WEEKLY_TEST_TARGET } from '../utils/weeklyChallenge.js';

// Shared "is this challenge complete but not yet claimed" logic — used by
// both ChallengeClaimNotifications (which challenge each card is) and
// Navbar (how many of them to show on the challenges icon's badge).
export function useReadyChallenges() {
  const {
    hourlyChallenge,
    hourlyChallengeTestsThisHour,
    claimedThisHour,
    dailyChallenge,
    dailyChallengeTestsToday,
    claimedToday,
    testsThisWeek,
    weeklyClaimed,
  } = useUser();

  const hourlyReady = Boolean(hourlyChallenge) && !claimedThisHour && hourlyChallengeTestsThisHour >= (hourlyChallenge?.testsTarget ?? Infinity);
  const dailyReady = Boolean(dailyChallenge) && !claimedToday && dailyChallengeTestsToday >= (dailyChallenge?.testsTarget ?? Infinity);
  const weeklyReady = !weeklyClaimed && testsThisWeek >= WEEKLY_TEST_TARGET;

  return {
    hourlyReady,
    dailyReady,
    weeklyReady,
    count: Number(hourlyReady) + Number(dailyReady) + Number(weeklyReady),
  };
}
