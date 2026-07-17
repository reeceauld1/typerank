import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../hooks/useAuth.js';
import { formatDuelSetting, type DuelMode } from '../utils/duels.js';
import UsernameText from './UsernameText.js';

interface IncomingInvite {
  id: string;
  creatorId: string;
  mode: DuelMode;
  value: number;
}

interface SenderLabel {
  username: string;
  nameColor: string;
}

// The receiving side of SentDuelInviteNotifications: a friend-targeted duel
// invite (opponent_id = me, still 'pending') shows up here with accept/
// decline no matter what page I'm on, not just if I happen to be on /duel
// looking at its own invite list. Accepting takes me straight into the
// "you're racing X" screen; declining just clears the card (the sender's
// own notification picks up the decline via its own realtime subscription).
export default function IncomingDuelInviteNotifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [invites, setInvites] = useState<Map<string, IncomingInvite>>(new Map());
  const [senders, setSenders] = useState<Record<string, SenderLabel>>({});
  const [respondingId, setRespondingId] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase || !user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInvites(new Map());
      return;
    }
    let cancelled = false;
    void supabase
      .from('duels')
      .select('id, creator_id, mode, value')
      .eq('opponent_id', user.id)
      .eq('status', 'pending')
      .then(({ data }) => {
        if (cancelled || !data) return;
        setInvites(
          new Map(
            data.map(row => [
              row.id as string,
              { id: row.id as string, creatorId: row.creator_id as string, mode: row.mode as DuelMode, value: row.value as number },
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
      .channel(`incoming-duel-invites-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'duels', filter: `opponent_id=eq.${user.id}` },
        payload => {
          const row = payload.new as { id: string; status: string; creator_id: string; mode: DuelMode; value: number } | undefined;
          if (!row) return;

          if (row.status === 'pending') {
            setInvites(prev => new Map(prev).set(row.id, { id: row.id, creatorId: row.creator_id, mode: row.mode, value: row.value }));
          } else {
            setInvites(prev => {
              if (!prev.has(row.id)) return prev;
              const next = new Map(prev);
              next.delete(row.id);
              return next;
            });
          }
        }
      )
      .subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    const missing = [...new Set([...invites.values()].map(i => i.creatorId))].filter(id => !(id in senders));
    if (missing.length === 0) return;
    void client
      .from('user_stats')
      .select('user_id, username, equipped_name_color')
      .in('user_id', missing)
      .then(({ data }) => {
        if (!data) return;
        setSenders(prev => {
          const next = { ...prev };
          for (const row of data) {
            next[row.user_id as string] = { username: row.username as string, nameColor: (row.equipped_name_color as string) ?? 'default' };
          }
          return next;
        });
      });
  }, [invites, senders]);

  const respond = async (id: string, accept: boolean) => {
    if (!supabase) return;
    setRespondingId(id);
    const { error } = await supabase.rpc(accept ? 'accept_duel_invite' : 'decline_duel_invite', { p_duel_id: id });
    setRespondingId(null);
    if (error) return;
    setInvites(prev => {
      if (!prev.has(id)) return prev;
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
    if (accept) navigate(`/duel/${id}`);
  };

  if (invites.size === 0) return null;

  return (
    <>
      {[...invites.values()].map(invite => {
        const sender = senders[invite.creatorId];
        return (
          <div key={invite.id} className="pointer-events-auto w-full sm:w-72 bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3 shadow-lg">
            <p className="text-sm text-[var(--text-correct)]">
              {sender ? <UsernameText username={sender.username} colorId={sender.nameColor} /> : 'someone'} challenged you to a{' '}
              {formatDuelSetting(invite.mode, invite.value)} duel.
            </p>
            <div className="flex items-center gap-2 mt-2">
              <button
                type="button"
                disabled={respondingId === invite.id}
                onClick={() => void respond(invite.id, false)}
                className="text-xs border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)] text-[var(--text-secondary)] px-3 py-1.5 rounded-md transition-colors cursor-pointer disabled:opacity-50"
              >
                decline
              </button>
              <button
                type="button"
                disabled={respondingId === invite.id}
                onClick={() => void respond(invite.id, true)}
                className="text-xs bg-[var(--accent)] hover:brightness-110 disabled:opacity-50 text-[var(--bg)] px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer"
              >
                {respondingId === invite.id ? '...' : 'accept'}
              </button>
            </div>
          </div>
        );
      })}
    </>
  );
}
