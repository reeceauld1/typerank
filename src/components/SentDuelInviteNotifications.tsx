import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../hooks/useAuth.js';
import { formatDuelSetting, DUEL_NOTIFICATION_TTL_MS, type DuelMode } from '../utils/duels.js';
import UsernameText from './UsernameText.js';
import NotificationTimerBar from './NotificationTimerBar.js';

interface SentInvite {
  id: string;
  opponentId: string | null;
  opponentName: string | null; // guest fallback, when opponentId has no account
  mode: DuelMode;
  value: number;
  createdAt: string;
}

interface DeclinedInvite {
  id: string;
  opponentId: string | null;
  opponentName: string | null;
}

interface PlayerLabel {
  username: string;
  nameColor: string;
}

// Keeps a sent-but-unaccepted duel invite alive no matter what page the
// sender is currently on (see the presence effect below), takes them
// straight to the "you're racing X" screen the moment it's accepted even if
// they've wandered off to another page, and — the part that used to be
// entirely invisible (this evolved from PendingDuelWatcher, which only ever
// rendered null) — shows a "waiting for X" card with a cancel button, and
// "X declined" if they don't accept, wherever the sender is on the site.
export default function SentDuelInviteNotifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const locationRef = useRef(location);
  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  const [pending, setPending] = useState<Map<string, SentInvite>>(new Map());
  const [declined, setDeclined] = useState<DeclinedInvite[]>([]);
  const [players, setPlayers] = useState<Record<string, PlayerLabel>>({});
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const channelsRef = useRef<Map<string, RealtimeChannel>>(new Map());

  // Seeds with whatever's already pending (e.g. a page reload while an
  // invite is still out) — the subscription below only sees changes from
  // the moment it subscribes onward.
  useEffect(() => {
    if (!supabase || !user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPending(new Map());
      return;
    }
    let cancelled = false;
    void supabase
      .from('duels')
      .select('id, opponent_id, opponent_name, mode, value, created_at')
      .eq('creator_id', user.id)
      .eq('status', 'pending')
      .then(({ data }) => {
        if (cancelled || !data) return;
        setPending(
          new Map(
            data.map(row => [
              row.id as string,
              {
                id: row.id as string,
                opponentId: row.opponent_id as string | null,
                opponentName: row.opponent_name as string | null,
                mode: row.mode as DuelMode,
                value: row.value as number,
                createdAt: row.created_at as string,
              },
            ])
          )
        );
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    const client = supabase;
    if (!client || !user) return;
    const channel = client
      .channel(`sent-duel-invites-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'duels', filter: `creator_id=eq.${user.id}` },
        payload => {
          const row = payload.new as
            | {
                id: string;
                status: string;
                opponent_id: string | null;
                opponent_name: string | null;
                mode: DuelMode;
                value: number;
                created_at: string;
              }
            | undefined;
          if (!row) return;

          if (row.status === 'pending') {
            setPending(prev =>
              new Map(prev).set(row.id, {
                id: row.id,
                opponentId: row.opponent_id,
                opponentName: row.opponent_name,
                mode: row.mode,
                value: row.value,
                createdAt: row.created_at,
              })
            );
            return;
          }

          setPending(prev => {
            if (!prev.has(row.id)) return prev;
            const next = new Map(prev);
            next.delete(row.id);
            return next;
          });

          if (row.status === 'declined') {
            setDeclined(prev => [...prev, { id: row.id, opponentId: row.opponent_id, opponentName: row.opponent_name }]);
          } else if (row.status === 'accepted' && locationRef.current.pathname !== `/duel/${row.id}`) {
            navigate(`/duel/${row.id}`);
          }
        }
      )
      .subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [user, navigate]);

  // Resolves display name/color for any opponent accounts not already known
  // — guest opponents (no account, opponentId null) fall back to
  // opponentName directly instead.
  useEffect(() => {
    const client = supabase;
    if (!client) return;
    const ids = new Set<string>();
    for (const invite of pending.values()) if (invite.opponentId) ids.add(invite.opponentId);
    for (const d of declined) if (d.opponentId) ids.add(d.opponentId);
    const missing = [...ids].filter(id => !(id in players));
    if (missing.length === 0) return;
    void client
      .from('user_stats')
      .select('user_id, username, equipped_name_color')
      .in('user_id', missing)
      .then(({ data }) => {
        if (!data) return;
        setPlayers(prev => {
          const next = { ...prev };
          for (const row of data) {
            next[row.user_id as string] = { username: row.username as string, nameColor: (row.equipped_name_color as string) ?? 'default' };
          }
          return next;
        });
      });
  }, [pending, declined, players]);

  // One presence channel per pending sent invite, keyed 'creator' — the
  // same channel name/key DuelMatch.tsx's own presence effect uses, so the
  // invited player's disconnect detection sees the same "creator" entry
  // whichever page the sender is actually on.
  useEffect(() => {
    const client = supabase;
    if (!client) return;
    const channels = channelsRef.current;
    const ids = [...pending.keys()];

    for (const id of ids) {
      if (channels.has(id)) continue;
      const channel = client.channel(`duel-presence-${id}`, { config: { presence: { key: 'creator' } } });
      channel.subscribe(status => {
        if (status === 'SUBSCRIBED') void channel.track({ online: true });
      });
      channels.set(id, channel);
    }

    for (const [id, channel] of channels) {
      if (!ids.includes(id)) {
        void client.removeChannel(channel);
        channels.delete(id);
      }
    }
  }, [pending]);

  // True unmount only (app closing/reloading) — tear down whatever's left.
  useEffect(() => {
    const channels = channelsRef.current;
    return () => {
      for (const channel of channels.values()) {
        void supabase?.removeChannel(channel);
      }
      channels.clear();
    };
  }, []);

  const dismissDeclined = (id: string) => setDeclined(prev => prev.filter(d => d.id !== id));

  // A declined card doesn't need a response — just clears itself after a
  // while so it doesn't linger forever if never manually dismissed.
  useEffect(() => {
    if (declined.length === 0) return;
    const timers = declined.map(d => setTimeout(() => dismissDeclined(d.id), 8000));
    return () => timers.forEach(clearTimeout);
  }, [declined]);

  const handleCancel = async (id: string) => {
    if (!supabase) return;
    setCancellingId(id);
    await supabase.rpc('cancel_duel_invite', { p_duel_id: id });
    setCancellingId(null);
    setPending(prev => {
      if (!prev.has(id)) return prev;
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  };

  const nameOf = (opponentId: string | null, fallback: string | null) => {
    const known = opponentId ? players[opponentId] : undefined;
    if (known) return <UsernameText username={known.username} colorId={known.nameColor} />;
    return <span className="font-semibold">{fallback ?? 'player'}</span>;
  };

  if (pending.size === 0 && declined.length === 0) return null;

  return (
    <>
      {[...pending.values()].map(invite => (
        <div key={invite.id} className="pointer-events-auto w-full sm:w-72 bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3 shadow-lg">
          <p className="text-sm text-[var(--text-correct)]">
            Waiting for {nameOf(invite.opponentId, invite.opponentName)} to accept your {formatDuelSetting(invite.mode, invite.value)} duel…
          </p>
          <button
            type="button"
            disabled={cancellingId === invite.id}
            onClick={() => void handleCancel(invite.id)}
            className="mt-2 text-xs border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)] text-[var(--text-secondary)] px-3 py-1.5 rounded-md transition-colors cursor-pointer disabled:opacity-50"
          >
            {cancellingId === invite.id ? '...' : 'cancel'}
          </button>
          <NotificationTimerBar createdAt={invite.createdAt} durationMs={DUEL_NOTIFICATION_TTL_MS} onExpire={() => void handleCancel(invite.id)} />
        </div>
      ))}
      {declined.map(d => (
        <div key={d.id} className="pointer-events-auto w-full sm:w-72 bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3 shadow-lg">
          <p className="text-sm text-[var(--text-correct)]">{nameOf(d.opponentId, d.opponentName)} declined your duel request.</p>
          <button
            type="button"
            onClick={() => dismissDeclined(d.id)}
            className="mt-2 text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors cursor-pointer"
          >
            dismiss
          </button>
        </div>
      ))}
    </>
  );
}
