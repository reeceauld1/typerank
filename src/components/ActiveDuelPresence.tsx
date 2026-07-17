import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../hooks/useAuth.js';
import { formatDuelSetting, DUEL_NOTIFICATION_TTL_MS, type DuelMode } from '../utils/duels.js';
import UsernameText from './UsernameText.js';
import NotificationTimerBar from './NotificationTimerBar.js';

interface ActiveDuel {
  id: string;
  role: 'creator' | 'opponent';
  opponentId: string | null;
  opponentName: string | null;
  mode: DuelMode;
  value: number;
  createdAt: string;
}

interface PlayerLabel {
  username: string;
  nameColor: string;
}

// Both players accepting used to be where the safety net stopped: once on
// /duel/:id, DuelMatch.tsx's own presence effect only tracks either side
// while *waiting* on something (accept, or a submitted result) — not during
// the race itself, so clicking away to another page mid-duel looked exactly
// like disconnecting to whoever's still there (see the widened
// waitingOnRole in DuelMatch.tsx, which now also treats that as a
// disconnect). Keeping this duel's presence alive here too, regardless of
// route, means ordinary SPA navigation away from the duel page no longer
// reads as "they left" — a real disconnect (tab actually closed) still
// drops presence for real, same as it always did. The card below is the
// other half: an obvious way back in, capped at the same 5-minute lifetime
// as a duel invite (see DUEL_NOTIFICATION_TTL_MS) so it doesn't linger
// forever if the match itself never wraps up.
export default function ActiveDuelPresence() {
  const { user } = useAuth();
  const location = useLocation();
  const [active, setActive] = useState<Map<string, ActiveDuel>>(new Map());
  const [players, setPlayers] = useState<Record<string, PlayerLabel>>({});
  const channelsRef = useRef<Map<string, RealtimeChannel>>(new Map());

  const refresh = async () => {
    if (!supabase || !user) return;
    const { data } = await supabase
      .from('duels')
      .select('id, creator_id, opponent_id, opponent_name, creator_name, mode, value, creator_wpm, opponent_wpm, created_at')
      .or(`creator_id.eq.${user.id},opponent_id.eq.${user.id}`)
      .eq('status', 'accepted');
    if (!data) return;
    const next = new Map<string, ActiveDuel>();
    for (const row of data) {
      const isCreator = row.creator_id === user.id;
      const myWpm = isCreator ? row.creator_wpm : row.opponent_wpm;
      if (myWpm !== null) continue; // already submitted my result — nothing left to keep alive
      next.set(row.id as string, {
        id: row.id as string,
        role: isCreator ? 'creator' : 'opponent',
        opponentId: (isCreator ? row.opponent_id : row.creator_id) as string | null,
        opponentName: (isCreator ? row.opponent_name : row.creator_name) as string | null,
        mode: row.mode as DuelMode,
        value: row.value as number,
        createdAt: row.created_at as string,
      });
    }
    setActive(next);
  };

  useEffect(() => {
    if (!user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActive(new Map());
      return;
    }
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    const client = supabase;
    if (!client || !user) return;
    const channel = client
      .channel(`active-duels-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'duels', filter: `creator_id=eq.${user.id}` }, () => void refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'duels', filter: `opponent_id=eq.${user.id}` }, () => void refresh())
      .subscribe();
    return () => {
      void client.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Resolves opponent display name/color for accounts not already known —
  // a guest opponent (no account) falls back to opponentName directly.
  useEffect(() => {
    const client = supabase;
    if (!client) return;
    const missing = [...new Set([...active.values()].map(a => a.opponentId).filter((id): id is string => Boolean(id)))].filter(
      id => !(id in players)
    );
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
  }, [active, players]);

  // One presence channel per active duel, keyed by my role — same channel
  // name/key DuelMatch.tsx's own presence effect uses, so whichever one is
  // actually tracking it doesn't matter to the other player.
  useEffect(() => {
    const client = supabase;
    if (!client) return;
    const channels = channelsRef.current;

    for (const [id, duel] of active) {
      if (channels.has(id)) continue;
      const channel = client.channel(`duel-presence-${id}`, { config: { presence: { key: duel.role } } });
      channel.subscribe(status => {
        if (status === 'SUBSCRIBED') void channel.track({ online: true });
      });
      channels.set(id, channel);
    }

    for (const [id, channel] of channels) {
      if (!active.has(id)) {
        void client.removeChannel(channel);
        channels.delete(id);
      }
    }
  }, [active]);

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

  const expireReminder = (id: string) => {
    setActive(prev => {
      if (!prev.has(id)) return prev;
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  };

  if (active.size === 0) return null;

  return (
    <>
      {[...active.values()]
        .filter(duel => location.pathname !== `/duel/${duel.id}`)
        .map(duel => {
          const opponent = duel.opponentId ? players[duel.opponentId] : undefined;
          return (
            <div key={duel.id} className="pointer-events-auto w-full sm:w-72 bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3 shadow-lg">
              <p className="text-sm text-[var(--text-correct)]">
                You're racing {opponent ? <UsernameText username={opponent.username} colorId={opponent.nameColor} /> : (duel.opponentName ?? 'someone')} —{' '}
                {formatDuelSetting(duel.mode, duel.value)} duel in progress.
              </p>
              <Link
                to={`/duel/${duel.id}`}
                className="mt-2 inline-block text-xs bg-[var(--accent)] hover:brightness-110 text-[var(--bg)] px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer"
              >
                return to duel
              </Link>
              <NotificationTimerBar createdAt={duel.createdAt} durationMs={DUEL_NOTIFICATION_TTL_MS} onExpire={() => expireReminder(duel.id)} />
            </div>
          );
        })}
    </>
  );
}
