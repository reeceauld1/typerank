import React, { useState, useEffect, useCallback } from 'react';
import type { UserStats, TestResult, TestMode } from '../types/index.js';
import { calculateXP, checkChallengeMilestone } from '../utils/xp.js';
import { getDailyChallenge, todayKey, type DailyChallenge } from '../utils/dailyChallenge.js';
import { weekKey, getWeekStart } from '../utils/weeklyChallenge.js';
import { mapStatsRow } from '../utils/statsMapping.js';
import { resolveAccentHex, hexToRgba, isMonochromeAccent } from '../utils/accentColors.js';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../hooks/useAuth.js';
import { UserContext } from './UserContextBase.js';

const defaultStats: UserStats = {
  username: '',
  usernameChangedAt: null,
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
  equippedAccentColor: 'blue',
  customAccentHex: null,
  equippedNameColor: 'default',
  elo: 1000,
  peakElo: 1000,
  rankedGamesPlayed: 0,
  rankedWins: 0,
  rankedLosses: 0,
  rankedDraws: 0,
};

function mapHistoryRow(row: Record<string, string | number>): TestResult {
  return {
    id: String(row.id),
    timestamp: new Date(row.created_at as string).getTime(),
    mode: row.mode as TestMode,
    value: row.value as number,
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

// Seeds the initial accent color from the same cache index.html's pre-paint
// script reads, so this component's first render (and the effect that
// applies --accent below) already matches what's on screen instead of
// starting from the hardcoded "blue" default and briefly overwriting the
// pre-paint script's color before the real fetch corrects it again.
function loadInitialStats(): UserStats {
  try {
    const color = window.localStorage.getItem('accentColor');
    if (color) {
      return { ...defaultStats, equippedAccentColor: color, customAccentHex: window.localStorage.getItem('accentHex') };
    }
  } catch {
    // ignore unavailable storage
  }
  return defaultStats;
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const isAccountSynced = Boolean(user && supabase);
  const dailyChallenge: DailyChallenge | null = user ? getDailyChallenge(user.id) : null;

  const [remoteStats, setRemoteStats] = useState<UserStats>(loadInitialStats);
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
    // Still resolving whether there's a session at all — leave the cached
    // initial state alone rather than briefly resetting to defaultStats
    // (blue) while we don't yet know if the user is actually signed in.
    if (authLoading) return;

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
  }, [authLoading, isAccountSynced, refreshRemoteStats]);

  useEffect(() => {
    // Cache the equipped color so index.html's pre-paint script can apply it
    // immediately on the next load, before React mounts and re-fetches the
    // real value — otherwise a non-default color flashes the CSS default
    // blue for a frame on every refresh.
    try {
      window.localStorage.setItem('accentColor', remoteStats.equippedAccentColor);
      if (remoteStats.customAccentHex) window.localStorage.setItem('accentHex', remoteStats.customAccentHex);
      else window.localStorage.removeItem('accentHex');
    } catch {
      // ignore unavailable storage
    }

    const root = document.documentElement;
    if (isMonochromeAccent(remoteStats.equippedAccentColor)) {
      // Resolved in CSS instead ([data-accent-mono='true'], keyed off the
      // same [data-theme] the base --accent value already uses) — clear any
      // inline value from a previous color so those rules can take effect.
      root.style.removeProperty('--accent');
      root.style.removeProperty('--accent-soft');
      root.style.removeProperty('--accent-glow');
      root.dataset.accentMono = 'true';
    } else {
      delete root.dataset.accentMono;
      const hex = resolveAccentHex(remoteStats);
      root.style.setProperty('--accent', hex);
      root.style.setProperty('--accent-soft', hexToRgba(hex, 0.14));
      root.style.setProperty('--accent-glow', hexToRgba(hex, 0.03));
    }
    // Only the two fields actually read above should retrigger this — not
    // every stats refresh, which would just reapply the same value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remoteStats.equippedAccentColor, remoteStats.customAccentHex]);

  const addTestResult = async (
    result: Omit<TestResult, 'id' | 'timestamp' | 'xpEarned'>,
    xpMultiplier = 1
  ): Promise<number> => {
    if (!isAccountSynced || !user || !supabase) return 0;

    const xpEarned = calculateXP(result.wpm, result.accuracy, result.mode, result.value, xpMultiplier);
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

  const setEquippedCosmetics = async (avatarId: string, borderId: string): Promise<boolean> => {
    if (!isAccountSynced || !user || !supabase) return false;

    const { error } = await supabase.rpc('set_equipped_cosmetics', {
      p_avatar_id: avatarId,
      p_border_id: borderId,
    });
    if (error) {
      console.error('setEquippedCosmetics failed:', error.message);
      return false;
    }
    await refreshRemoteStats();
    return true;
  };

  const setEquippedAccentColor = async (colorId: string, customHex?: string): Promise<boolean> => {
    if (!isAccountSynced || !user || !supabase) return false;

    const { error } = await supabase.rpc('set_equipped_accent_color', {
      p_color_id: colorId,
      p_custom_hex: customHex ?? null,
    });
    if (error) {
      console.error('setEquippedAccentColor failed:', error.message);
      return false;
    }
    await refreshRemoteStats();
    return true;
  };

  const setEquippedNameColor = async (colorId: string): Promise<boolean> => {
    if (!isAccountSynced || !user || !supabase) return false;

    const { error } = await supabase.rpc('set_equipped_name_color', { p_color_id: colorId });
    if (error) {
      console.error('setEquippedNameColor failed:', error.message);
      return false;
    }
    await refreshRemoteStats();
    return true;
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
        setEquippedAccentColor,
        setEquippedNameColor,
        // Ranked matches call submit_ranked_result directly (it updates
        // both players' elo server-side, unlike addTestResult which only
        // ever touches the caller's own row) — this just exposes the same
        // refresh every other mutation here already does afterward.
        refreshStats: refreshRemoteStats,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}
