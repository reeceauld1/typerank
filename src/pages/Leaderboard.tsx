import { Fragment, useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../hooks/useAuth.js';
import { useFriends } from '../hooks/useFriends.js';
import Avatar from '../components/Avatar.js';
import AuthForm from '../components/AuthForm.js';
import UsernameText from '../components/UsernameText.js';
import UsernameBadge from '../components/UsernameBadge.js';
import TierBadge from '../components/RankBadge.js';
import { PLACEMENT_GAMES } from '../utils/rank.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';

type Scope = 'global' | 'friends' | 'personal';

interface Category {
  key: string;
  label: string;
  mode: 'time' | 'words';
  value: number;
  column: string;
}

const CATEGORIES: Category[] = [
  { key: 'time10', label: '10s', mode: 'time', value: 10, column: 'best_wpm_time10' },
  { key: 'time30', label: '30s', mode: 'time', value: 30, column: 'best_wpm_time30' },
  { key: 'time60', label: '60s', mode: 'time', value: 60, column: 'best_wpm_time60' },
  { key: 'words10', label: '10 words', mode: 'words', value: 10, column: 'best_wpm_words10' },
  { key: 'words25', label: '25 words', mode: 'words', value: 25, column: 'best_wpm_words25' },
  { key: 'words50', label: '50 words', mode: 'words', value: 50, column: 'best_wpm_words50' },
];

interface RankedUser {
  userId: string;
  username: string;
  equippedAvatar: string;
  equippedBorder: string;
  equippedNameColor: string;
  equippedBadge: string | null;
  wpm: number;
}

interface PersonalRun {
  id: string;
  wpm: number;
  accuracy: number;
  createdAt: string;
}

interface RankedRow {
  userId: string;
  username: string;
  equippedAvatar: string;
  equippedBorder: string;
  equippedNameColor: string;
  equippedBadge: string | null;
  elo: number;
  rankedGamesPlayed: number;
}

// Not a real Category (no mode/value/test_history equivalent), so it's kept
// out of the CATEGORIES array and handled as its own branch throughout —
// only a global/friends elo ranking makes sense, there's no "personal"
// equivalent the way a single test mode/value has past runs.
const RANKED_KEY = 'ranked';

// Matches the border-catalog gold/silver/bronze colors in cosmetics.tsx, so
// a top-3 leaderboard placement visually echoes the earnable border tiers.
const RANK_COLORS: Record<number, string> = { 1: '#ffd24a', 2: '#c7ccd1', 3: '#b08d57' };

function RankBadge({ rank }: { rank: number }) {
  return (
    <span
      className="w-7 shrink-0 text-center text-sm font-semibold tabular-nums"
      style={RANK_COLORS[rank] ? { color: RANK_COLORS[rank] } : undefined}
    >
      {rank}
    </span>
  );
}

export default function Leaderboard() {
  useDocumentTitle('leaderboard');
  const { user, isConfigured } = useAuth();
  const { friends } = useFriends();
  const [scope, setScope] = useState<Scope>('global');
  const [categoryKey, setCategoryKey] = useState<string>(CATEGORIES[1].key);
  const [userRows, setUserRows] = useState<RankedUser[]>([]);
  const [personalRows, setPersonalRows] = useState<PersonalRun[]>([]);
  const [rankedRows, setRankedRows] = useState<RankedRow[]>([]);
  const [loading, setLoading] = useState(false);

  const isRanked = categoryKey === RANKED_KEY;
  const category = useMemo(() => CATEGORIES.find(c => c.key === categoryKey) ?? CATEGORIES[1], [categoryKey]);

  const loadRankedRows = useCallback(
    async (targetScope: 'global' | 'friends') => {
      if (!supabase || (targetScope === 'friends' && !user)) {
        setRankedRows([]);
        return;
      }

      if (targetScope === 'global') {
        const { data } = await supabase
          .from('user_stats')
          .select('*')
          .gte('ranked_games_played', PLACEMENT_GAMES)
          .order('elo', { ascending: false })
          .limit(25);
        setRankedRows(
          (data ?? []).map((row: Record<string, unknown>) => ({
            userId: row.user_id as string,
            username: row.username as string,
            equippedAvatar: row.equipped_avatar as string,
            equippedBorder: row.equipped_border as string,
            equippedNameColor: (row.equipped_name_color as string) ?? 'default',
            equippedBadge: (row.equipped_badge as string | null) ?? null,
            elo: (row.elo as number) ?? 1000,
            rankedGamesPlayed: (row.ranked_games_played as number) ?? 0,
          }))
        );
        return;
      }

      if (!user) return;
      const ids = Array.from(new Set([user.id, ...friends.map(f => f.userId)]));
      const { data } = await supabase
        .from('user_stats')
        .select('*')
        .in('user_id', ids)
        .gte('ranked_games_played', PLACEMENT_GAMES);
      const rows = (data ?? []).map((row: Record<string, unknown>) => ({
        userId: row.user_id as string,
        username: row.username as string,
        equippedAvatar: row.equipped_avatar as string,
        equippedBorder: row.equipped_border as string,
        equippedNameColor: (row.equipped_name_color as string) ?? 'default',
        equippedBadge: (row.equipped_badge as string | null) ?? null,
        elo: (row.elo as number) ?? 1000,
        rankedGamesPlayed: (row.ranked_games_played as number) ?? 0,
      }));
      rows.sort((a, b) => b.elo - a.elo);
      setRankedRows(rows.slice(0, 25));
    },
    [user, friends]
  );

  const loadUserRows = useCallback(
    async (targetScope: 'global' | 'friends', cat: Category) => {
      if (!supabase || (targetScope === 'friends' && !user)) {
        setUserRows([]);
        return;
      }

      if (targetScope === 'global') {
        const { data } = await supabase
          .from('user_stats')
          .select('*')
          .gt(cat.column, 0)
          .order(cat.column, { ascending: false })
          .limit(25);
        setUserRows(
          (data ?? []).map((row: Record<string, unknown>) => ({
            userId: row.user_id as string,
            username: row.username as string,
            equippedAvatar: row.equipped_avatar as string,
            equippedBorder: row.equipped_border as string,
            equippedNameColor: (row.equipped_name_color as string) ?? 'default',
            equippedBadge: (row.equipped_badge as string | null) ?? null,
            wpm: (row[cat.column] as number) ?? 0,
          }))
        );
        return;
      }

      if (!user) return;
      const ids = Array.from(new Set([user.id, ...friends.map(f => f.userId)]));
      const { data } = await supabase.from('user_stats').select('*').in('user_id', ids).gt(cat.column, 0);
      const rows = (data ?? []).map((row: Record<string, unknown>) => ({
        userId: row.user_id as string,
        username: row.username as string,
        equippedAvatar: row.equipped_avatar as string,
        equippedBorder: row.equipped_border as string,
        equippedNameColor: (row.equipped_name_color as string) ?? 'default',
        equippedBadge: (row.equipped_badge as string | null) ?? null,
        wpm: (row[cat.column] as number) ?? 0,
      }));
      rows.sort((a, b) => b.wpm - a.wpm);
      setUserRows(rows.slice(0, 25));
    },
    [user, friends]
  );

  const loadPersonalRows = useCallback(
    async (cat: Category) => {
      if (!supabase || !user) {
        setPersonalRows([]);
        return;
      }
      const { data } = await supabase
        .from('test_history')
        .select('id, wpm, accuracy, created_at')
        .eq('user_id', user.id)
        .eq('mode', cat.mode)
        .eq('value', cat.value)
        .order('wpm', { ascending: false })
        .limit(25);
      setPersonalRows(
        (data ?? []).map(row => ({
          id: row.id as string,
          wpm: row.wpm as number,
          accuracy: row.accuracy as number,
          createdAt: row.created_at as string,
        }))
      );
    },
    [user]
  );

  useEffect(() => {
    // Friends/personal need an account; global doesn't.
    if (scope !== 'global' && !user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUserRows([]);
      setPersonalRows([]);
      setRankedRows([]);
      return;
    }
    setLoading(true);
    // Ranked has no personal (per-run) equivalent — elo isn't a per-test
    // score the way wpm is, so 'personal' scope falls back to 'global'
    // rather than calling loadPersonalRows with a category that doesn't
    // exist. (The ranked button also resets scope away from 'personal'
    // when clicked, so this fallback only matters if scope changes while
    // ranked is already selected.)
    const load = isRanked
      ? loadRankedRows(scope === 'personal' ? 'global' : scope)
      : scope === 'personal'
        ? loadPersonalRows(category)
        : loadUserRows(scope, category);
    load.finally(() => setLoading(false));
  }, [scope, category, isRanked, user, loadUserRows, loadPersonalRows, loadRankedRows]);

  if (!isConfigured) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 pb-16">
        <p className="text-[var(--text-correct)] font-semibold">Accounts aren't set up yet</p>
        <p className="text-[var(--text-muted)] text-sm max-w-md">
          This deployment hasn't been connected to Supabase, so the leaderboard isn't available.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col py-10 px-6">
      <div className="max-w-4xl w-full mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-8">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--text-correct)]">leaderboard</h1>
        <Link
          to="/"
          className="text-sm border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)] text-[var(--text-secondary)] px-4 py-2 rounded-lg transition-colors"
        >
          back to test
        </Link>
      </div>

      <div className="max-w-4xl w-full mx-auto flex flex-col gap-4 mb-6">
        <div className="flex items-center gap-1 bg-[var(--surface)] border border-[var(--border)] rounded-lg p-1 text-sm">
          {(
            // Ranked has no personal (per-run) equivalent — elo isn't a
            // per-test score the way wpm is.
            (isRanked ? ['global', 'friends'] : ['global', 'friends', 'personal']) as Scope[]
          ).map(s => (
            <button
              key={s}
              onClick={() => setScope(s)}
              className={`flex-1 py-2 rounded-md font-medium transition-colors cursor-pointer ${
                scope === s ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="flex items-center flex-wrap justify-center gap-1 w-fit mx-auto bg-[var(--surface)] border border-[var(--border)] rounded-lg px-2 py-2 text-xs">
          {CATEGORIES.map((c, i) => (
            <Fragment key={c.key}>
              {i === 3 && <span className="w-px h-4 bg-[var(--border)] mx-1" />}
              <button
                onClick={() => setCategoryKey(c.key)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                  categoryKey === c.key ? 'text-[var(--accent)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
              >
                {c.label}
              </button>
            </Fragment>
          ))}
          <span className="w-px h-4 bg-[var(--border)] mx-1" />
          <button
            onClick={() => {
              setCategoryKey(RANKED_KEY);
              if (scope === 'personal') setScope('global');
            }}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${
              isRanked ? 'text-[var(--accent)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            }`}
          >
            ranked
          </button>
        </div>
      </div>

      <div className="max-w-4xl w-full mx-auto flex flex-col gap-2">
        {scope !== 'global' && !user ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <AuthForm />
          </div>
        ) : loading ? (
          <p className="text-sm text-[var(--text-muted)] text-center py-8">loading…</p>
        ) : isRanked ? (
          rankedRows.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)] text-center py-8">
              {scope === 'friends' ? 'no ranked friends yet.' : 'no ranked players yet — be the first.'}
            </p>
          ) : (
            rankedRows.map((row, i) => (
              <div
                key={row.userId}
                className={`flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 rounded-lg px-4 py-3 border ${
                  row.userId === user?.id
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                    : 'border-[var(--border)] bg-[var(--surface)]'
                }`}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <RankBadge rank={i + 1} />
                  <Link
                    to={`/u/${row.username}`}
                    state={{ from: 'leaderboard' }}
                    className="flex items-center gap-3 flex-1 min-w-0 group"
                  >
                    <Avatar avatarId={row.equippedAvatar} borderId={row.equippedBorder} size="sm" />
                    <UsernameText username={row.username} colorId={row.equippedNameColor} className="truncate" />
                    <UsernameBadge badgeId={row.equippedBadge} />
                  </Link>
                </div>
                <TierBadge elo={row.elo} rankedGamesPlayed={row.rankedGamesPlayed} className="shrink-0 pl-11 sm:pl-0 sm:ml-auto" />
              </div>
            ))
          )
        ) : scope === 'personal' ? (
          personalRows.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)] text-center py-8">
              no {category.label} runs yet — go set a score.
            </p>
          ) : (
            personalRows.map((run, i) => (
              <div
                key={run.id}
                className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 bg-[var(--surface)] border border-[var(--border)] rounded-lg px-4 py-3"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <RankBadge rank={i + 1} />
                  <span className="flex-1 min-w-0 truncate text-sm text-[var(--text-muted)]">
                    {new Date(run.createdAt).toLocaleDateString()} {new Date(run.createdAt).toLocaleTimeString()}
                  </span>
                </div>
                <div className="flex items-center gap-3 shrink-0 pl-11 sm:pl-0 sm:ml-auto">
                  <span className="text-sm text-[var(--text-muted)] whitespace-nowrap">{run.accuracy}% acc</span>
                  <span className="text-lg font-semibold text-[var(--text-correct)] tabular-nums whitespace-nowrap">
                    {run.wpm} <span className="text-xs font-normal text-[var(--text-muted)]">wpm</span>
                  </span>
                </div>
              </div>
            ))
          )
        ) : userRows.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)] text-center py-8">
            {scope === 'friends' ? 'no friends with a score here yet.' : 'no scores yet for this category.'}
          </p>
        ) : (
          userRows.map((row, i) => (
            <div
              key={row.userId}
              className={`flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 rounded-lg px-4 py-3 border ${
                row.userId === user?.id
                  ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                  : 'border-[var(--border)] bg-[var(--surface)]'
              }`}
            >
              <div className="flex items-center gap-4 min-w-0">
                <RankBadge rank={i + 1} />
                <Link
                  to={`/u/${row.username}`}
                  state={{ from: 'leaderboard' }}
                  className="flex items-center gap-3 flex-1 min-w-0 group"
                >
                  <Avatar avatarId={row.equippedAvatar} borderId={row.equippedBorder} size="sm" />
                  <UsernameText username={row.username} colorId={row.equippedNameColor} className="truncate" />
                  <UsernameBadge badgeId={row.equippedBadge} />
                </Link>
              </div>
              <span className="text-lg font-semibold text-[var(--text-correct)] tabular-nums shrink-0 whitespace-nowrap pl-11 sm:pl-0 sm:ml-auto">
                {row.wpm} <span className="text-xs font-normal text-[var(--text-muted)]">wpm</span>
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
