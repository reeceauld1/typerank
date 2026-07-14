import React, { useState, useEffect, useCallback } from 'react';
import type { UserStats, TestResult, TestMode, TimeMode, WordMode } from '../types/index.js';
import { calculateLevel, calculateXP, checkChallengeMilestone } from '../utils/xp.js';
import { getDailyChallenge, todayKey, type DailyChallenge } from '../utils/dailyChallenge.js';
import { weekKey, getWeekStart } from '../utils/weeklyChallenge.js';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../hooks/useAuth.js';
import { UserContext } from './UserContextBase.js';

const defaultStats: UserStats = {
  totalTests: 0,
  totalXp: 0,
  level: 1,
  totalTimeTyped: 0,
  totalAccuracySum: 0,
  totalWpmSum: 0,
  bestWpm: {
    time10: 0,
    time30: 0,
    time60: 0,
    words10: 0,
    words25: 0,
    words50: 0,
  },
  testHistory: [],
  equippedAvatar: 'keyboard',
  equippedBorder: 'none',
};

function mapStatsRow(row: Record<string, number | string> | null): Omit<UserStats, 'testHistory'> {
  const totalXp = (row?.total_xp as number) ?? 0;
  return {
    totalTests: (row?.total_tests as number) ?? 0,
    totalXp,
    level: calculateLevel(totalXp),
    totalTimeTyped: (row?.total_time_typed as number) ?? 0,
    totalAccuracySum: (row?.total_accuracy_sum as number) ?? 0,
    totalWpmSum: (row?.total_wpm_sum as number) ?? 0,
    bestWpm: {
      time10: (row?.best_wpm_time10 as number) ?? 0,
      time30: (row?.best_wpm_time30 as number) ?? 0,
      time60: (row?.best_wpm_time60 as number) ?? 0,
      words10: (row?.best_wpm_words10 as number) ?? 0,
      words25: (row?.best_wpm_words25 as number) ?? 0,
      words50: (row?.best_wpm_words50 as number) ?? 0,
    },
    equippedAvatar: (row?.equipped_avatar as string) ?? 'keyboard',
    equippedBorder: (row?.equipped_border as string) ?? 'none',
  };
}

function mapHistoryRow(row: Record<string, string | number>): TestResult {
  return {
    id: String(row.id),
    timestamp: new Date(row.created_at as string).getTime(),
    mode: row.mode as TestMode,
    value: row.value as TimeMode | WordMode,
    wpm: row.wpm as number,
    accuracy: row.accuracy as number,
    rawWpm: row.raw_wpm as number,
    correctChars: row.correct_chars as number,
    incorrectChars: row.incorrect_chars as number,
    timeElapsed: row.time_elapsed as number,
    xpEarned: row.xp_earned as number,
  };
}

function startOfTodayIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const isAccountSynced = Boolean(user && supabase);
  const dailyChallenge: DailyChallenge | null = user ? getDailyChallenge(user.id) : null;

  const [remoteStats, setRemoteStats] = useState<UserStats>(defaultStats);
  const [loading, setLoading] = useState(false);
  const [lastXpGained, setLastXpGained] = useState<number | null>(null);
  const [claimedToday, setClaimedToday] = useState(false);
  const [dailyChallengeTestsToday, setDailyChallengeTestsToday] = useState(0);
  const [weeklyClaimed, setWeeklyClaimed] = useState(false);
  const [remoteTestsThisWeek, setRemoteTestsThisWeek] = useState(0);

  const refreshRemoteStats = useCallback(async () => {
    if (!user || !supabase) return;

    const weekStartIso = getWeekStart().toISOString();
    const todayStartIso = startOfTodayIso();
    const challenge = getDailyChallenge(user.id);

    const [statsRes, historyRes, claimRes, weeklyClaimRes, weekCountRes, dailyCountRes] = await Promise.all([
      supabase.from('user_stats').select('*').eq('user_id', user.id).maybeSingle(),
      supabase
        .from('test_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100),
      supabase
        .from('daily_challenge_claims')
        .select('challenge_date')
        .eq('challenge_date', todayKey())
        .maybeSingle(),
      supabase
        .from('weekly_challenge_claims')
        .select('week_start')
        .eq('week_start', weekKey())
        .maybeSingle(),
      supabase
        .from('test_history')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', weekStartIso),
      supabase
        .from('test_history')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('mode', challenge.mode)
        .eq('value', challenge.value)
        .gte('created_at', todayStartIso),
    ]);

    setRemoteStats({
      ...mapStatsRow(statsRes.data as Record<string, number | string> | null),
      testHistory: (historyRes.data ?? []).map(row => mapHistoryRow(row as Record<string, string | number>)),
    });
    setClaimedToday(Boolean(claimRes.data));
    setWeeklyClaimed(Boolean(weeklyClaimRes.data));
    setRemoteTestsThisWeek(weekCountRes.count ?? 0);
    setDailyChallengeTestsToday(dailyCountRes.count ?? 0);
  }, [user]);

  useEffect(() => {
    if (!isAccountSynced) {
      // Signed out (or account sync unavailable): nothing is tracked, so
      // reset to a clean slate rather than showing stale/guest data.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRemoteStats(defaultStats);
      setClaimedToday(false);
      setDailyChallengeTestsToday(0);
      setWeeklyClaimed(false);
      setRemoteTestsThisWeek(0);
      return;
    }
    setLoading(true);
    refreshRemoteStats().finally(() => setLoading(false));
  }, [isAccountSynced, refreshRemoteStats]);

  const addTestResult = async (result: Omit<TestResult, 'id' | 'timestamp' | 'xpEarned'>): Promise<number> => {
    if (!isAccountSynced || !user || !supabase) return 0;

    const xpEarned = calculateXP(result.wpm, result.accuracy, result.mode, result.value);
    const milestone = checkChallengeMilestone({ ...result, id: '', timestamp: 0, xpEarned });
    const totalXpEarned = xpEarned + (milestone.achieved ? milestone.bonus : 0);

    const { error } = await supabase.rpc('record_test_result', {
      p_mode: result.mode,
      p_value: result.value,
      p_wpm: result.wpm,
      p_accuracy: result.accuracy,
      p_raw_wpm: result.rawWpm,
      p_correct_chars: result.correctChars,
      p_incorrect_chars: result.incorrectChars,
      p_time_elapsed: result.timeElapsed,
      p_xp_earned: totalXpEarned,
    });
    if (!error) await refreshRemoteStats();

    setLastXpGained(totalXpEarned);
    return totalXpEarned;
  };

  const clearLastXpGained = () => setLastXpGained(null);

  const claimDailyChallengeBonus = async (): Promise<boolean> => {
    if (!isAccountSynced || !user || !supabase || !dailyChallenge || claimedToday) return false;
    if (dailyChallengeTestsToday < dailyChallenge.testsTarget) return false;

    const { data, error } = await supabase.rpc('claim_daily_challenge', {
      p_mode: dailyChallenge.mode,
      p_value: dailyChallenge.value,
      p_tests_target: dailyChallenge.testsTarget,
      p_xp_bonus: dailyChallenge.xpBonus,
    });
    if (error || !data) return false;
    await refreshRemoteStats();
    setLastXpGained(dailyChallenge.xpBonus);
    return true;
  };

  const claimWeeklyChallengeBonus = async (weekStart: string, testsTarget: number, xpBonus: number): Promise<boolean> => {
    if (!isAccountSynced || !user || !supabase || weeklyClaimed) return false;

    const { data, error } = await supabase.rpc('claim_weekly_challenge', {
      p_week_start: weekStart,
      p_tests_target: testsTarget,
      p_xp_bonus: xpBonus,
    });
    if (error || !data) return false;
    await refreshRemoteStats();
    setLastXpGained(xpBonus);
    return true;
  };

  const setEquippedCosmetics = async (avatarId: string, borderId: string): Promise<void> => {
    if (!isAccountSynced || !user || !supabase) return;

    const { error } = await supabase.rpc('set_equipped_cosmetics', {
      p_avatar_id: avatarId,
      p_border_id: borderId,
    });
    if (!error) await refreshRemoteStats();
  };

  return (
    <UserContext.Provider
      value={{
        stats: remoteStats,
        loading,
        lastXpGained,
        isAccountSynced,
        claimedToday,
        dailyChallenge,
        dailyChallengeTestsToday,
        testsThisWeek: remoteTestsThisWeek,
        weeklyClaimed,
        addTestResult,
        clearLastXpGained,
        claimDailyChallengeBonus,
        claimWeeklyChallengeBonus,
        setEquippedCosmetics,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}
