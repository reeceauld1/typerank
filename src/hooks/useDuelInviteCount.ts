import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { useAuth } from './useAuth.js';

export function useDuelInviteCount(): number {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    const client = supabase;
    if (!client || !user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCount(0);
      return;
    }

    let cancelled = false;
    const refresh = async () => {
      const { count: c } = await client
        .from('duels')
        .select('id', { count: 'exact', head: true })
        .eq('opponent_id', user.id)
        .eq('status', 'pending');
      if (!cancelled) setCount(c ?? 0);
    };
    void refresh();

    const channel = client
      .channel(`duel-invite-count-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'duels', filter: `opponent_id=eq.${user.id}` }, () => {
        void refresh();
      })
      .subscribe();

    return () => {
      cancelled = true;
      void client.removeChannel(channel);
    };
  }, [user]);

  return count;
}
