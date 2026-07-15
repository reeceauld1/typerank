import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { WordMode } from '../types/index.js';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../hooks/useAuth.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { generateText } from '../utils/words.js';
import TypingTest from '../components/TypingTest.js';
import Avatar from '../components/Avatar.js';
import AuthForm from '../components/AuthForm.js';

type DuelStatus = 'open' | 'pending' | 'accepted' | 'declined' | 'cancelled';

interface DuelRow {
  id: string;
  creator_id: string | null;
  opponent_id: string | null;
  creator_name: string | null;
  opponent_name: string | null;
  creator_token: string | null;
  opponent_token: string | null;
  word_count: number;
  word_list: string;
  status: DuelStatus;
  creator_wpm: number | null;
  creator_accuracy: number | null;
  creator_raw_wpm: number | null;
  opponent_wpm: number | null;
  opponent_accuracy: number | null;
  opponent_raw_wpm: number | null;
  creator_rematch: boolean;
  opponent_rematch: boolean;
  rematch_duel_id: string | null;
}

interface PlayerInfo {
  username: string;
  equippedAvatar: string;
  equippedBorder: string;
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
        <span className="text-sm font-medium text-[var(--text-correct)] truncate">{name}</span>
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
  const navigate = useNavigate();
  const { user, isConfigured } = useAuth();

  const [duel, setDuel] = useState<DuelRow | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState<Record<string, PlayerInfo>>({});
  const [responding, setResponding] = useState(false);
  const [respondError, setRespondError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [opponentPresent, setOpponentPresent] = useState<boolean | null>(null);
  const [opponentEverPresent, setOpponentEverPresent] = useState(false);
  const [guestToken, setGuestToken] = useState<string | null>(null);
  const [joinName, setJoinName] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReady(false);
  }, [id]);

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

  // A guest's identity for this duel — a random token issued on create/join
  // and remembered per-browser, since there's no account to check against.
  useEffect(() => {
    if (!id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setGuestToken(null);
      return;
    }
    try {
      setGuestToken(sessionStorage.getItem(`duel_token_${id}`));
    } catch {
      setGuestToken(null);
    }
  }, [id]);

  // creator_id/creator_token (and opponent_id/opponent_token) are mutually
  // exclusive by construction — whichever path someone joined through sets
  // only its own pair — so matching either one directly is sufficient;
  // gating the token check behind "was this duel guest-created" was the
  // bug: a guest opponent's token is valid regardless of how the creator
  // joined.
  const isCreator = Boolean(
    duel && ((user && user.id === duel.creator_id) || (guestToken && guestToken === duel.creator_token))
  );
  const isOpponent = Boolean(
    duel && ((user && user.id === duel.opponent_id) || (guestToken && guestToken === duel.opponent_token))
  );
  const waitingForAccept = isCreator && duel?.status === 'pending';
  const haveSubmittedResult = Boolean(
    duel && ((isCreator && duel.creator_wpm !== null) || (isOpponent && duel.opponent_wpm !== null))
  );
  const bothFinished = Boolean(duel && duel.creator_wpm !== null && duel.opponent_wpm !== null);
  const waitingForOpponentToFinish = haveSubmittedResult && !bothFinished;

  // Presence keyed by role (not user id) so it works the same whether
  // either side is signed in or a guest.
  const myRole: 'creator' | 'opponent' | null = isCreator ? 'creator' : isOpponent ? 'opponent' : null;
  const waitingOnRole: 'creator' | 'opponent' | null =
    waitingForAccept || waitingForOpponentToFinish ? (isCreator ? 'opponent' : 'creator') : null;

  // Tracks whether whoever we're waiting on is actually still connected —
  // lets us tell "they haven't shown up yet" (normal, keep waiting) apart
  // from "they were here and left" (show cancelled instead of waiting
  // forever).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpponentEverPresent(false);
    setOpponentPresent(null);

    const client = supabase;
    if (!client || !id || !myRole || !waitingOnRole) return;

    const channel = client.channel(`duel-presence-${id}`, { config: { presence: { key: myRole } } });
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

  // If the creator navigates away from a friend invite before it's been
  // accepted, withdraw it — otherwise the recipient's pending-invite badge
  // and /duel list would keep showing it indefinitely. Tracked via a ref
  // (rather than effect deps) so this only fires on a true unmount, not on
  // every status change while the page stays open.
  const latestCancelInfoRef = useRef({ id, isCreator, status: duel?.status });
  useEffect(() => {
    latestCancelInfoRef.current = { id, isCreator, status: duel?.status };
  });
  useEffect(() => {
    return () => {
      const { id: duelId, isCreator: wasCreator, status } = latestCancelInfoRef.current;
      if (wasCreator && status === 'pending' && duelId && supabase) {
        void supabase.rpc('cancel_duel_invite', { p_duel_id: duelId });
      }
    };
  }, []);

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

  const handleGuestJoin = async (nameOverride?: string) => {
    const name = (nameOverride ?? joinName).trim();
    if (!supabase || !id || !name) return;
    setResponding(true);
    setRespondError(null);
    const { data, error } = await supabase.rpc('join_guest_duel', { p_duel_id: id, p_name: name });
    setResponding(false);
    if (error || !data) {
      setRespondError("Couldn't join — try again.");
      return;
    }
    try {
      sessionStorage.setItem(`duel_token_${id}`, data as string);
    } catch {
      // ignore unavailable storage
    }
    setGuestToken(data as string);
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
    if (!supabase || !id || !duel) return;
    // Whether *my own* slot (whichever one I am) was filled via an account
    // or a guest token — not whether the duel as a whole was guest-created.
    const mySlotIsGuest = isCreator ? duel.creator_id === null : duel.opponent_id === null;
    if (mySlotIsGuest) {
      if (!guestToken) return;
      await supabase.rpc('submit_guest_duel_result', {
        p_duel_id: id,
        p_token: guestToken,
        p_wpm: stats.wpm,
        p_accuracy: stats.accuracy,
        p_raw_wpm: stats.rawWpm,
        p_time_elapsed: stats.timeElapsed,
      });
    } else {
      await supabase.rpc('submit_duel_result', {
        p_duel_id: id,
        p_wpm: stats.wpm,
        p_accuracy: stats.accuracy,
        p_raw_wpm: stats.rawWpm,
        p_time_elapsed: stats.timeElapsed,
      });
    }
    await loadDuel();
  };

  const copyLink = () => {
    void navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRematch = async () => {
    if (!supabase || !id || !duel) return;
    const wordList = generateText(duel.word_count);
    const mySlotIsGuest = isCreator ? duel.creator_id === null : duel.opponent_id === null;
    if (mySlotIsGuest) {
      if (!guestToken) return;
      await supabase.rpc('request_guest_rematch', { p_duel_id: id, p_token: guestToken, p_word_list: wordList });
    } else {
      await supabase.rpc('request_rematch', { p_duel_id: id, p_word_list: wordList });
    }
    await loadDuel();
  };

  // Once both sides have requested a rematch, a fresh duel is created and
  // this fires on both clients (via the same Realtime subscription already
  // watching this row) to send them there together.
  useEffect(() => {
    if (duel?.rematch_duel_id) {
      navigate(`/duel/${duel.rematch_duel_id}`);
    }
  }, [duel?.rematch_duel_id, navigate]);

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

  const isParticipant = isCreator || isOpponent;
  const opponentSlotOpen = !duel.opponent_id && !duel.opponent_name;
  const challengerName = players[duel.creator_id ?? '']?.username ?? duel.creator_name ?? 'someone';

  // Not part of this duel at all.
  if (!isParticipant) {
    if (duel.status === 'open' && opponentSlotOpen) {
      // Any open duel — whether created by a guest or an account holder —
      // can be joined either way: an account holder links their real
      // account (avatar, profile) via join_duel, no name needed; a guest
      // enters a name and joins via join_guest_duel.
      if (user) {
        return (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 pb-16 text-center px-6">
            <p className="text-[var(--text-correct)] font-semibold">
              {challengerName} challenged you to a {duel.word_count}-word duel.
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
        <div className="flex-1 flex flex-col items-center justify-center gap-4 pb-16 text-center px-6">
          <p className="text-[var(--text-correct)] font-semibold">
            {challengerName} challenged you to a {duel.word_count}-word duel.
          </p>
          <input
            type="text"
            autoFocus
            maxLength={20}
            placeholder="your name"
            value={joinName}
            onChange={e => setJoinName(e.target.value)}
            className="w-full max-w-xs bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg px-4 py-2.5 text-sm text-center text-[var(--text-correct)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
          />
          {respondError && <p className="text-[var(--text-incorrect)] text-sm">{respondError}</p>}
          <button
            type="button"
            disabled={responding || !joinName.trim()}
            onClick={() => void handleGuestJoin()}
            className="bg-[var(--accent)] hover:brightness-110 disabled:opacity-50 text-[var(--bg)] px-6 py-2.5 rounded-lg font-semibold transition-all cursor-pointer"
          >
            {responding ? '...' : 'confirm'}
          </button>
        </div>
      );
    }
    // A targeted friend invite (opponent slot already claimed by a
    // specific account) — only that account can accept it, so a
    // signed-out visitor needs to sign in to find out if it's them.
    if (duel.status === 'pending' && !opponentSlotOpen && !user) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 pb-16">
          <AuthForm />
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

  // Invited by a friend, haven't responded yet (auth-only — guest duels
  // never have a 'pending' status).
  if (isOpponent && duel.status === 'pending') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 pb-16 text-center px-6">
        <p className="text-[var(--text-correct)] font-semibold">
          {players[duel.creator_id ?? '']?.username ?? 'someone'} challenged you to a {duel.word_count}-word duel.
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
          {players[duel.opponent_id ?? '']?.username ?? duel.opponent_name ?? 'they'} declined this duel.
        </p>
        <Link to="/duel" className="text-sm text-[var(--accent)] hover:underline">
          start a new one
        </Link>
      </div>
    );
  }

  // The invite was withdrawn — either side revisiting.
  if (duel.status === 'cancelled') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 pb-16">
        <p className="text-[var(--text-correct)] font-semibold">This invite was cancelled.</p>
        <Link to="/duel" className="text-sm text-[var(--accent)] hover:underline">
          start a new one
        </Link>
      </div>
    );
  }

  // Whoever we're waiting on (accept, or a finished result) disconnected.
  if (matchCancelled) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 pb-16">
        <p className="text-[var(--text-correct)] font-semibold">Match cancelled</p>
        <p className="text-[var(--text-muted)] text-sm">The other player disconnected.</p>
        <Link to="/duel" className="text-sm text-[var(--accent)] hover:underline">
          start a new one
        </Link>
      </div>
    );
  }

  // I'm the creator of a friend invite that hasn't been accepted yet.
  if (waitingForAccept) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 pb-16 text-center px-6">
        <p className="text-[var(--text-correct)] font-semibold">
          Waiting for {players[duel.opponent_id ?? '']?.username ?? duel.opponent_name ?? 'them'} to accept…
        </p>
      </div>
    );
  }

  // I've created an open duel and no one has joined via the link yet.
  if (opponentSlotOpen) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 pb-16 text-center px-6">
        <p className="text-[var(--text-correct)] font-semibold">Waiting for an opponent to join…</p>
        <button
          type="button"
          onClick={copyLink}
          className="text-sm border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)] text-[var(--text-secondary)] px-4 py-2 rounded-lg transition-colors cursor-pointer"
        >
          {copied ? 'link copied' : 'copy duel link'}
        </button>
      </div>
    );
  }

  const myName = isCreator
    ? (players[duel.creator_id ?? '']?.username ?? duel.creator_name ?? 'you')
    : (players[duel.opponent_id ?? '']?.username ?? duel.opponent_name ?? 'you');
  const opponentName = isCreator
    ? (players[duel.opponent_id ?? '']?.username ?? duel.opponent_name ?? 'opponent')
    : (players[duel.creator_id ?? '']?.username ?? duel.creator_name ?? 'opponent');
  const myAvatar = isCreator ? players[duel.creator_id ?? ''] : players[duel.opponent_id ?? ''];
  const opponentAvatar = isCreator ? players[duel.opponent_id ?? ''] : players[duel.creator_id ?? ''];
  const myWpm = isCreator ? duel.creator_wpm : duel.opponent_wpm;
  const opponentWpm = isCreator ? duel.opponent_wpm : duel.creator_wpm;

  // Both players are in — a shared moment to see who you're racing before
  // the test starts, rather than the creator finding themselves mid-test
  // alone the instant someone joins.
  if (!haveSubmittedResult && !ready) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 pb-16 text-center px-6">
        <p className="text-[var(--text-correct)] font-semibold">You're racing {opponentName}.</p>
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
          name={myName}
          avatar={myAvatar}
          wpm={myWpm}
          accuracy={isCreator ? duel.creator_accuracy : duel.opponent_accuracy}
          rawWpm={isCreator ? duel.creator_raw_wpm : duel.opponent_raw_wpm}
          winner={bothFinished && myWpm !== null && opponentWpm !== null && myWpm > opponentWpm}
        />
        <ResultCard
          name={opponentName}
          avatar={opponentAvatar}
          wpm={opponentWpm}
          accuracy={isCreator ? duel.opponent_accuracy : duel.creator_accuracy}
          rawWpm={isCreator ? duel.opponent_raw_wpm : duel.creator_raw_wpm}
          winner={bothFinished && myWpm !== null && opponentWpm !== null && opponentWpm > myWpm}
        />
      </div>

      {bothFinished && (
        <button
          type="button"
          disabled={isCreator ? duel.creator_rematch : duel.opponent_rematch}
          onClick={() => void handleRematch()}
          className="bg-[var(--accent)] hover:brightness-110 disabled:opacity-50 text-[var(--bg)] px-6 py-2.5 rounded-lg font-semibold transition-all cursor-pointer"
        >
          {(isCreator ? duel.creator_rematch : duel.opponent_rematch) ? 'waiting for opponent…' : 'rematch'}{' '}
          {Number(duel.creator_rematch) + Number(duel.opponent_rematch)}/2
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
