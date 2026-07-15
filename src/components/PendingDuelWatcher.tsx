import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../hooks/useAuth.js';

// Renders nothing — this only exists to keep a sent-but-unaccepted duel
// invite alive no matter what page the sender is currently on, and to take
// them straight to the "you're racing X" screen the moment it's accepted
// even if they're not looking at that duel's page when it happens.
//
// DuelMatch.tsx's own waiting screen only tracks this while it's mounted
// (i.e. while the sender is actually on /duel/:id) — navigating to any
// other page unmounts it, which used to both cancel the invite (an
// unmount-cleanup effect) and drop the sender's presence on that duel's
// channel, which the invited player's side reads as "they disconnected"
// and auto-expires the invite. Mounted once at the app root regardless of
// route, this component keeps presence (and therefore the invite) alive
// for as long as the sender's tab stays open, and independently watches
// for the acceptance so it can navigate the sender there from wherever
// they've wandered off to.
export default function PendingDuelWatcher() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [pendingIds, setPendingIds] = useState<string[]>([]);
  const channelsRef = useRef<Map<string, RealtimeChannel>>(new Map());

  // Read inside the realtime handler below, which is only set up once per
  // user and would otherwise only ever see the pathname from that render.
  const locationRef = useRef(location);
  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  // Seeds with whatever's already pending (e.g. a page reload while an
  // invite is still out) — the subscription below only sees changes from
  // the moment it subscribes onward.
  useEffect(() => {
    if (!supabase || !user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPendingIds([]);
      return;
    }
    let cancelled = false;
    void supabase
      .from('duels')
      .select('id')
      .eq('creator_id', user.id)
      .eq('status', 'pending')
      .then(({ data }) => {
        if (!cancelled) setPendingIds((data ?? []).map(row => row.id as string));
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    const client = supabase;
    if (!client || !user) return;
    const channel = client
      .channel(`pending-duels-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'duels', filter: `creator_id=eq.${user.id}` },
        payload => {
          const row = payload.new as { id: string; status: string } | undefined;
          if (!row) return;

          if (row.status === 'pending') {
            setPendingIds(prev => (prev.includes(row.id) ? prev : [...prev, row.id]));
            return;
          }

          setPendingIds(prev => prev.filter(id => id !== row.id));
          if (row.status === 'accepted' && locationRef.current.pathname !== `/duel/${row.id}`) {
            navigate(`/duel/${row.id}`);
          }
        }
      )
      .subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [user, navigate]);

  // One presence channel per pending sent invite, keyed 'creator' — the
  // same channel name and key DuelMatch.tsx's own presence effect uses, so
  // whichever side is tracking it, the invited player's disconnect
  // detection sees the same "creator" entry either way.
  useEffect(() => {
    const client = supabase;
    if (!client) return;
    const channels = channelsRef.current;

    for (const id of pendingIds) {
      if (channels.has(id)) continue;
      const channel = client.channel(`duel-presence-${id}`, { config: { presence: { key: 'creator' } } });
      channel.subscribe(status => {
        if (status === 'SUBSCRIBED') void channel.track({ online: true });
      });
      channels.set(id, channel);
    }

    for (const [id, channel] of channels) {
      if (!pendingIds.includes(id)) {
        void client.removeChannel(channel);
        channels.delete(id);
      }
    }
  }, [pendingIds]);

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

  return null;
}
