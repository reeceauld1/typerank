import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { TestConfig } from '../types/index.js';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../hooks/useAuth.js';
import { useUser } from '../hooks/useUser.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { generateSeededWordList } from '../utils/words.js';
import { getRankTier } from '../utils/rank.js';
import TypingTest from '../components/TypingTest.js';
import Avatar from '../components/Avatar.js';
import UsernameText from '../components/UsernameText.js';
import UsernameBadge from '../components/UsernameBadge.js';

interface RankedMatchRow {
  id: string;
  player1_id: string;
  player2_id: string;
  value: number;
  word_seed: string | number;
  status: 'in_progress' | 'finished';
  player1_elo_before: number;
  player2_elo_before: number;
  player1_elo_after: number | null;
  player2_elo_after: number | null;
  player1_wpm: number | null;
  player1_accuracy: number | null;
  player1_raw_wpm: number | null;
  player2_wpm: number | null;
  player2_accuracy: number | null;
  player2_raw_wpm: number | null;
}

interface PlayerInfo {
  username: string;
  equippedAvatar: string;
  equippedBorder: string;
  equippedNameColor: string;
  equippedBadge: string | null;
}

function ResultCard({
  name,
  avatar,
  wpm,
  accuracy,
  rawWpm,
  winner,
}: {
  name: string;
  avatar: PlayerInfo | undefined;
  wpm: number | null;
  accuracy: number | null;
  rawWpm: number | null;
  winner: boolean;
}) {
  return (
    <div
      className={`flex-1 rounded-xl border px-6 py-5 text-center ${
        winner ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : 'border-[var(--border)] bg-[var(--surface)]'
      }`}
    >
      <div className="flex items-center justify-center gap-2 mb-3">
        {avatar && <Avatar avatarId={avatar.equippedAvatar} borderId={avatar.equippedBorder} size="sm" />}
        <UsernameText username={name} colorId={avatar?.equippedNameColor ?? 'default'} className="text-sm truncate" />
        <UsernameBadge badgeId={avatar?.equippedBadge} />
        {winner && <span className="text-xs font-semibold text-[var(--accent)]">winner</span>}
      </div>
      {wpm === null ? (
        <p className="text-sm text-[var(--text-muted)]">waiting…</p>
      ) : (
        <>
          <div className="text-3xl font-semibold text-[var(--accent)] tabular-nums">{wpm}</div>
          <div className="text-xs text-[var(--text-muted)] mt-1 tracking-widest uppercase">wpm</div>
          <p className="text-xs text-[var(--text-muted)] mt-2">
            {accuracy}% acc · {rawWpm} raw
          </p>
        </>
      )}
    </div>
  );
}

export default function RankedMatch() {
  useDocumentTitle('ranked');
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isConfigured } = useAuth();
  const { stats, refreshStats } = useUser();

  const [match, setMatch] = useState<RankedMatchRow | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState<Record<string, PlayerInfo>>({});
  const [ready, setReady] = useState(false);
  const [opponentPresent, setOpponentPresent] = useState<boolean | null>(null);
  const [opponentEverPresent, setOpponentEverPresent] = useState(false);
  const [gamesPlayedBeforeMatch, setGamesPlayedBeforeMatch] = useState<number | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReady(false);
  }, [id]);

  const loadPlayers = useCallback(async (ids: string[]) => {
    if (!supabase || ids.length === 0) return;
    const { data } = await supabase
      .from('user_stats')
      .select('user_id, username, equipped_avatar, equipped_border, equipped_name_color, equipped_badge')
      .in('user_id', ids);
    if (!data) return;
    setPlayers(prev => {
      const next = { ...prev };
      for (const row of data) {
        next[row.user_id as string] = {
          username: row.username as string,
          equippedAvatar: row.equipped_avatar as string,
          equippedBorder: row.equipped_border as string,
          equippedNameColor: (row.equipped_name_color as string) ?? 'default',
          equippedBadge: (row.equipped_badge as string | null) ?? null,
        };
      }
      return next;
    });
  }, []);

  const loadMatch = useCallback(async () => {
    if (!supabase || !id) return;
    const { data } = await supabase.from('ranked_matches').select('*').eq('id', id).maybeSingle();
    if (!data) {
      setNotFound(true);
      return;
    }
    const row = data as RankedMatchRow;
    setMatch(row);
    void loadPlayers([row.player1_id, row.player2_id]);
  }, [id, loadPlayers]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    loadMatch().finally(() => setLoading(false));
  }, [loadMatch]);

  useEffect(() => {
    const client = supabase;
    if (!client || !id) return;
    const channel = client
      .channel(`ranked-match-${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'ranked_matches', filter: `id=eq.${id}` }, payload => {
        const row = payload.new as RankedMatchRow;
        setMatch(row);
        void loadPlayers([row.player1_id, row.player2_id]);
      })
      .subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [id, loadPlayers]);

  const isPlayer1 = Boolean(match && user && user.id === match.player1_id);
  const isPlayer2 = Boolean(match && user && user.id === match.player2_id);
  const isParticipant = isPlayer1 || isPlayer2;

  const haveSubmittedResult = Boolean(
    match && ((isPlayer1 && match.player1_wpm !== null) || (isPlayer2 && match.player2_wpm !== null))
  );
  const bothFinished = Boolean(match && match.player1_wpm !== null && match.player2_wpm !== null);
  const waitingForOpponentToFinish = haveSubmittedResult && !bothFinished;

  // Captures rankedGamesPlayed the moment we land on a fresh, unfinished
  // match — used afterward (once refreshStats() pulls the post-match total)
  // to tell whether *this* match was the one that ended placements, for the
  // "you're ranked now!" callout on the results screen.
  useEffect(() => {
    if (match && !bothFinished && gamesPlayedBeforeMatch === null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setGamesPlayedBeforeMatch(stats.rankedGamesPlayed);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Boolean(match), bothFinished]);

  // Presence keyed by role, same pattern as duels — lets "opponent hasn't
  // finished yet" (normal, keep waiting) be told apart from "opponent was
  // here and left" (show cancelled instead of waiting forever). No accept
  // step exists for ranked matches (they start 'in_progress' the moment
  // matchmaking creates them), so this is the only disconnect case.
  const myRole: 'player1' | 'player2' | null = isPlayer1 ? 'player1' : isPlayer2 ? 'player2' : null;
  const waitingOnRole: 'player1' | 'player2' | null = waitingForOpponentToFinish
    ? isPlayer1
      ? 'player2'
      : 'player1'
    : null;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpponentEverPresent(false);
    setOpponentPresent(null);

    const client = supabase;
    if (!client || !id || !myRole || !waitingOnRole) return;

    const channel = client.channel(`ranked-presence-${id}`, { config: { presence: { key: myRole } } });
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const present = waitingOnRole in state;
      if (present) setOpponentEverPresent(true);
      setOpponentPresent(present);
    });
    channel.subscribe(status => {
      if (status === 'SUBSCRIBED') void channel.track({ online: true });
    });

    return () => {
      void client.removeChannel(channel);
    };
  }, [id, myRole, waitingOnRole]);

  const matchCancelled = waitingOnRole !== null && opponentEverPresent && opponentPresent === false;

  const handleComplete = async (result: {
    wpm: number;
    accuracy: number;
    rawWpm: number;
    timeElapsed: number;
    correctChars: number;
    incorrectChars: number;
  }) => {
    if (!supabase || !id) return;
    await supabase.rpc('submit_ranked_result', {
      p_match_id: id,
      p_wpm: result.wpm,
      p_accuracy: result.accuracy,
      p_raw_wpm: result.rawWpm,
      p_time_elapsed: result.timeElapsed,
    });
    await refreshStats();
    await loadMatch();
  };

  if (!isConfigured) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 pb-16">
        <p className="text-[var(--text-correct)] font-semibold">Accounts aren't set up yet</p>
        <p className="text-[var(--text-muted)] text-sm max-w-md">
          This deployment hasn't been connected to Supabase, so ranked matches aren't available.
        </p>
      </div>
    );
  }

  if (loading) return null;

  if (notFound || !match || !isParticipant) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 pb-16">
        <p className="text-[var(--text-correct)] font-semibold">Match not found</p>
        <Link to="/ranked" className="text-sm text-[var(--accent)] hover:underline">
          find a new match
        </Link>
      </div>
    );
  }

  if (matchCancelled) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 pb-16">
        <p className="text-[var(--text-correct)] font-semibold">Match cancelled</p>
        <p className="text-[var(--text-muted)] text-sm">The other player disconnected.</p>
        <Link to="/ranked" className="text-sm text-[var(--accent)] hover:underline">
          find a new match
        </Link>
      </div>
    );
  }

  const myName = isPlayer1
    ? (players[match.player1_id]?.username ?? 'you')
    : (players[match.player2_id]?.username ?? 'you');
  const opponentName = isPlayer1
    ? (players[match.player2_id]?.username ?? 'opponent')
    : (players[match.player1_id]?.username ?? 'opponent');
  const myAvatar = isPlayer1 ? players[match.player1_id] : players[match.player2_id];
  const opponentAvatar = isPlayer1 ? players[match.player2_id] : players[match.player1_id];
  const myWpm = isPlayer1 ? match.player1_wpm : match.player2_wpm;
  const opponentWpm = isPlayer1 ? match.player2_wpm : match.player1_wpm;
  const myEloBefore = isPlayer1 ? match.player1_elo_before : match.player2_elo_before;
  const myEloAfter = isPlayer1 ? match.player1_elo_after : match.player2_elo_after;

  if (!haveSubmittedResult && !ready) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 pb-16 text-center px-6">
        <p className="text-[var(--text-correct)] font-semibold">
          You're matched against{' '}
          <UsernameText username={opponentName} colorId={opponentAvatar?.equippedNameColor ?? 'default'} /> (
          {(isPlayer1 ? match.player2_elo_before : match.player1_elo_before).toLocaleString()} elo).
        </p>
        <button
          type="button"
          onClick={() => setReady(true)}
          className="bg-[var(--accent)] hover:brightness-110 text-[var(--bg)] px-6 py-2.5 rounded-lg font-semibold transition-all cursor-pointer"
        >
          start
        </button>
      </div>
    );
  }

  if (!haveSubmittedResult) {
    return (
      <div className="flex-1 flex items-center justify-center px-6 py-10">
        <div className="relative w-[92%] sm:w-[80%] lg:w-[65%]">
          <TypingTest
            config={{ mode: 'time', value: match.value } as TestConfig}
            fixedText={generateSeededWordList(Number(match.word_seed))}
            skipStatsSave
            onComplete={r => void handleComplete(r)}
          />
        </div>
      </div>
    );
  }

  const eloDelta = bothFinished && myEloAfter !== null ? myEloAfter - myEloBefore : null;
  const tierBefore =
    bothFinished && gamesPlayedBeforeMatch !== null ? getRankTier(myEloBefore, gamesPlayedBeforeMatch) : null;
  const tierAfter = bothFinished ? getRankTier(stats.elo, stats.rankedGamesPlayed) : null;
  const tierChanged = bothFinished && tierBefore?.id !== tierAfter?.id;

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 gap-6">
      <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-correct)]">
        {bothFinished ? 'ranked results' : 'waiting for opponent…'}
      </h1>

      <div className="w-full max-w-lg flex gap-4">
        <ResultCard
          name={myName}
          avatar={myAvatar}
          wpm={myWpm}
          accuracy={isPlayer1 ? match.player1_accuracy : match.player2_accuracy}
          rawWpm={isPlayer1 ? match.player1_raw_wpm : match.player2_raw_wpm}
          winner={bothFinished && myWpm !== null && opponentWpm !== null && myWpm > opponentWpm}
        />
        <ResultCard
          name={opponentName}
          avatar={opponentAvatar}
          wpm={opponentWpm}
          accuracy={isPlayer1 ? match.player2_accuracy : match.player1_accuracy}
          rawWpm={isPlayer1 ? match.player2_raw_wpm : match.player1_raw_wpm}
          winner={bothFinished && myWpm !== null && opponentWpm !== null && opponentWpm > myWpm}
        />
      </div>

      {bothFinished && eloDelta !== null && (
        <div className="text-center">
          <p className="text-sm text-[var(--text-secondary)]">
            {myEloBefore.toLocaleString()} → {(myEloAfter ?? myEloBefore).toLocaleString()} elo{' '}
            <span className={eloDelta >= 0 ? 'text-[var(--text-correct)]' : 'text-[var(--text-incorrect)]'}>
              ({eloDelta >= 0 ? '+' : ''}
              {eloDelta})
            </span>
          </p>
          {tierChanged && tierAfter && (
            <p className="text-sm font-semibold text-[var(--accent)] mt-1">
              {tierBefore ? `ranked up to ${tierAfter.name}!` : `placed into ${tierAfter.name}!`}
            </p>
          )}
        </div>
      )}

      {bothFinished && (
        <button
          type="button"
          onClick={() => navigate('/ranked')}
          className="bg-[var(--accent)] hover:brightness-110 text-[var(--bg)] px-6 py-2.5 rounded-lg font-semibold transition-all cursor-pointer"
        >
          find another match
        </button>
      )}

      <Link
        to="/ranked"
        className="text-sm border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)] text-[var(--text-secondary)] px-4 py-2 rounded-lg transition-colors"
      >
        back to ranked
      </Link>
    </div>
  );
}
