import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { WordMode } from '../types/index.js';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../hooks/useAuth.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import TypingTest from '../components/TypingTest.js';
import Avatar from '../components/Avatar.js';
import AuthForm from '../components/AuthForm.js';

type DuelStatus = 'open' | 'pending' | 'accepted' | 'declined';

interface DuelRow {
  id: string;
  creator_id: string;
  opponent_id: string | null;
  word_count: number;
  word_list: string;
  status: DuelStatus;
  creator_wpm: number | null;
  creator_accuracy: number | null;
  creator_raw_wpm: number | null;
  opponent_wpm: number | null;
  opponent_accuracy: number | null;
  opponent_raw_wpm: number | null;
}

interface PlayerInfo {
  username: string;
  equippedAvatar: string;
  equippedBorder: string;
}

function ResultCard({
  label,
  player,
  wpm,
  accuracy,
  rawWpm,
  winner,
}: {
  label: string;
  player: PlayerInfo | undefined;
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
        {player && <Avatar avatarId={player.equippedAvatar} borderId={player.equippedBorder} size="sm" />}
        <span className="text-sm font-medium text-[var(--text-correct)] truncate">{player?.username ?? label}</span>
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

export default function DuelMatch() {
  useDocumentTitle('duel');
  const { id } = useParams<{ id: string }>();
  const { user, isConfigured } = useAuth();

  const [duel, setDuel] = useState<DuelRow | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState<Record<string, PlayerInfo>>({});
  const [responding, setResponding] = useState(false);
  const [respondError, setRespondError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadPlayers = useCallback(async (ids: string[]) => {
    if (!supabase || ids.length === 0) return;
    const { data } = await supabase.from('user_stats').select('user_id, username, equipped_avatar, equipped_border').in('user_id', ids);
    if (!data) return;
    setPlayers(prev => {
      const next = { ...prev };
      for (const row of data) {
        next[row.user_id as string] = {
          username: row.username as string,
          equippedAvatar: row.equipped_avatar as string,
          equippedBorder: row.equipped_border as string,
        };
      }
      return next;
    });
  }, []);

  const loadDuel = useCallback(async () => {
    if (!supabase || !id) return;
    const { data } = await supabase.from('duels').select('*').eq('id', id).maybeSingle();
    if (!data) {
      setNotFound(true);
      return;
    }
    const row = data as DuelRow;
    setDuel(row);
    void loadPlayers([row.creator_id, row.opponent_id].filter((v): v is string => v !== null));
  }, [id, loadPlayers]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    loadDuel().finally(() => setLoading(false));
  }, [loadDuel]);

  useEffect(() => {
    const client = supabase;
    if (!client || !id) return;
    const channel = client
      .channel(`duel-${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'duels', filter: `id=eq.${id}` }, payload => {
        const row = payload.new as DuelRow;
        setDuel(row);
        void loadPlayers([row.creator_id, row.opponent_id].filter((v): v is string => v !== null));
      })
      .subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [id, loadPlayers]);

  const handleJoin = async () => {
    if (!supabase || !id) return;
    setResponding(true);
    setRespondError(null);
    const { error } = await supabase.rpc('join_duel', { p_duel_id: id });
    setResponding(false);
    if (error) {
      setRespondError(error.message.includes('opponent') ? 'Someone already joined this duel.' : "Couldn't join — try again.");
      return;
    }
    await loadDuel();
  };

  const handleAcceptInvite = async () => {
    if (!supabase || !id) return;
    setResponding(true);
    setRespondError(null);
    const { error } = await supabase.rpc('accept_duel_invite', { p_duel_id: id });
    setResponding(false);
    if (error) {
      setRespondError("Couldn't accept — try again.");
      return;
    }
    await loadDuel();
  };

  const handleDeclineInvite = async () => {
    if (!supabase || !id) return;
    setResponding(true);
    await supabase.rpc('decline_duel_invite', { p_duel_id: id });
    setResponding(false);
    await loadDuel();
  };

  const handleComplete = async (stats: { wpm: number; accuracy: number; rawWpm: number; timeElapsed: number }) => {
    if (!supabase || !id) return;
    await supabase.rpc('submit_duel_result', {
      p_duel_id: id,
      p_wpm: stats.wpm,
      p_accuracy: stats.accuracy,
      p_raw_wpm: stats.rawWpm,
      p_time_elapsed: stats.timeElapsed,
    });
    await loadDuel();
  };

  const copyLink = () => {
    void navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isConfigured) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 pb-16">
        <p className="text-[var(--text-correct)] font-semibold">Accounts aren't set up yet</p>
        <p className="text-[var(--text-muted)] text-sm max-w-md">
          This deployment hasn't been connected to Supabase, so duels aren't available.
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 pb-16">
        <AuthForm />
      </div>
    );
  }

  if (loading) return null;

  if (notFound || !duel) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 pb-16">
        <p className="text-[var(--text-correct)] font-semibold">Duel not found</p>
        <Link to="/duel" className="text-sm text-[var(--accent)] hover:underline">
          start a new one
        </Link>
      </div>
    );
  }

  const isCreator = user.id === duel.creator_id;
  const isOpponent = user.id === duel.opponent_id;
  const isParticipant = isCreator || isOpponent;

  // Not part of this duel at all.
  if (!isParticipant) {
    if (duel.status === 'open' && !duel.opponent_id) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 pb-16 text-center px-6">
          <p className="text-[var(--text-correct)] font-semibold">
            {players[duel.creator_id]?.username ?? 'someone'} challenged you to a {duel.word_count}-word duel.
          </p>
          {respondError && <p className="text-[var(--text-incorrect)] text-sm">{respondError}</p>}
          <button
            type="button"
            disabled={responding}
            onClick={() => void handleJoin()}
            className="bg-[var(--accent)] hover:brightness-110 disabled:opacity-50 text-[var(--bg)] px-6 py-2.5 rounded-lg font-semibold transition-all cursor-pointer"
          >
            {responding ? '...' : 'accept duel'}
          </button>
        </div>
      );
    }
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 pb-16">
        <p className="text-[var(--text-correct)] font-semibold">This duel isn't available</p>
        <Link to="/duel" className="text-sm text-[var(--accent)] hover:underline">
          start your own
        </Link>
      </div>
    );
  }

  // Invited by a friend, haven't responded yet.
  if (isOpponent && duel.status === 'pending') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 pb-16 text-center px-6">
        <p className="text-[var(--text-correct)] font-semibold">
          {players[duel.creator_id]?.username ?? 'someone'} challenged you to a {duel.word_count}-word duel.
        </p>
        {respondError && <p className="text-[var(--text-incorrect)] text-sm">{respondError}</p>}
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={responding}
            onClick={() => void handleDeclineInvite()}
            className="text-sm border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)] text-[var(--text-secondary)] px-4 py-2 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            decline
          </button>
          <button
            type="button"
            disabled={responding}
            onClick={() => void handleAcceptInvite()}
            className="bg-[var(--accent)] hover:brightness-110 disabled:opacity-50 text-[var(--bg)] px-6 py-2.5 rounded-lg font-semibold transition-all cursor-pointer"
          >
            {responding ? '...' : 'accept'}
          </button>
        </div>
      </div>
    );
  }

  // Creator revisiting after the invite was declined.
  if (isCreator && duel.status === 'declined') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 pb-16">
        <p className="text-[var(--text-correct)] font-semibold">
          {players[duel.opponent_id ?? '']?.username ?? 'they'} declined this duel.
        </p>
        <Link to="/duel" className="text-sm text-[var(--accent)] hover:underline">
          start a new one
        </Link>
      </div>
    );
  }

  const myWpm = isCreator ? duel.creator_wpm : duel.opponent_wpm;
  const opponentIdKnown = isCreator ? duel.opponent_id : duel.creator_id;
  const opponentWpm = isCreator ? duel.opponent_wpm : duel.creator_wpm;
  const haveSubmitted = myWpm !== null;
  const bothFinished = duel.creator_wpm !== null && duel.opponent_wpm !== null;

  if (!haveSubmitted) {
    return (
      <div className="flex-1 flex items-center justify-center px-6 py-10">
        <div className="relative w-[92%] sm:w-[80%] lg:w-[65%]">
          <TypingTest
            config={{ mode: 'words', value: duel.word_count as WordMode }}
            fixedText={duel.word_list}
            skipStatsSave
            onComplete={stats => void handleComplete(stats)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 gap-6">
      <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-correct)]">
        {bothFinished ? 'duel results' : 'waiting for opponent…'}
      </h1>

      <div className="w-full max-w-lg flex gap-4">
        <ResultCard
          label="you"
          player={players[user.id]}
          wpm={myWpm}
          accuracy={isCreator ? duel.creator_accuracy : duel.opponent_accuracy}
          rawWpm={isCreator ? duel.creator_raw_wpm : duel.opponent_raw_wpm}
          winner={bothFinished && myWpm !== null && opponentWpm !== null && myWpm > opponentWpm}
        />
        <ResultCard
          label="opponent"
          player={opponentIdKnown ? players[opponentIdKnown] : undefined}
          wpm={opponentWpm}
          accuracy={isCreator ? duel.opponent_accuracy : duel.creator_accuracy}
          rawWpm={isCreator ? duel.opponent_raw_wpm : duel.creator_raw_wpm}
          winner={bothFinished && myWpm !== null && opponentWpm !== null && opponentWpm > myWpm}
        />
      </div>

      {!duel.opponent_id && (
        <button
          type="button"
          onClick={copyLink}
          className="text-sm border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)] text-[var(--text-secondary)] px-4 py-2 rounded-lg transition-colors cursor-pointer"
        >
          {copied ? 'link copied' : 'copy duel link'}
        </button>
      )}

      <Link
        to="/duel"
        className="text-sm border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)] text-[var(--text-secondary)] px-4 py-2 rounded-lg transition-colors"
      >
        start a new duel
      </Link>
    </div>
  );
}
