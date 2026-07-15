import React, { useState, useCallback, useEffect } from 'react';
import type { FriendEntry } from '../types/index.js';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../hooks/useAuth.js';
import { FriendsContext } from './FriendsContextBase.js';

interface FriendshipRow {
  requester_id: string;
  addressee_id: string;
  status: 'pending' | 'accepted';
}

interface StatsRow {
  user_id: string;
  username: string;
  equipped_avatar: string;
  equipped_border: string;
  equipped_name_color: string;
}

export function FriendsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const isAccountSynced = Boolean(user && supabase);

  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendEntry[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user || !supabase) return;

    const { data: rows } = await supabase
      .from('friendships')
      .select('*')
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);
    const friendships = (rows ?? []) as FriendshipRow[];

    const otherIds = friendships.map(r => (r.requester_id === user.id ? r.addressee_id : r.requester_id));
    if (otherIds.length === 0) {
      setFriends([]);
      setIncomingRequests([]);
      setOutgoingRequests([]);
      return;
    }

    const { data: statRows } = await supabase
      .from('user_stats')
      .select('user_id, username, equipped_avatar, equipped_border, equipped_name_color')
      .in('user_id', otherIds);
    const statsById = new Map((statRows as StatsRow[] | null ?? []).map(row => [row.user_id, row]));

    const nextFriends: FriendEntry[] = [];
    const nextIncoming: FriendEntry[] = [];
    const nextOutgoing: FriendEntry[] = [];

    for (const row of friendships) {
      const otherId = row.requester_id === user.id ? row.addressee_id : row.requester_id;
      const stat = statsById.get(otherId);
      if (!stat) continue;
      const entry: FriendEntry = {
        userId: otherId,
        username: stat.username,
        equippedAvatar: stat.equipped_avatar,
        equippedBorder: stat.equipped_border,
        equippedNameColor: stat.equipped_name_color ?? 'default',
      };
      if (row.status === 'accepted') nextFriends.push(entry);
      else if (row.requester_id === user.id) nextOutgoing.push(entry);
      else nextIncoming.push(entry);
    }

    setFriends(nextFriends);
    setIncomingRequests(nextIncoming);
    setOutgoingRequests(nextOutgoing);
  }, [user]);

  useEffect(() => {
    if (!isAccountSynced) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFriends([]);
      setIncomingRequests([]);
      setOutgoingRequests([]);
      return;
    }
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [isAccountSynced, refresh]);

  // Otherwise this only ever updates on *my own* actions (send/accept/
  // decline/remove, each of which calls refresh() itself below) — someone
  // else accepting a request I sent, or sending me a new one, would
  // otherwise sit stale until a manual page reload. requester_id and
  // addressee_id need separate filters since postgres_changes only
  // supports one column-equality filter per subscription.
  useEffect(() => {
    const client = supabase;
    if (!client || !user) return;
    const channel = client
      .channel(`friendships-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friendships', filter: `requester_id=eq.${user.id}` },
        () => void refresh()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friendships', filter: `addressee_id=eq.${user.id}` },
        () => void refresh()
      )
      .subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [user, refresh]);

  const sendRequest = async (username: string): Promise<{ ok: boolean; error?: string }> => {
    if (!user || !supabase) return { ok: false, error: 'not signed in' };
    const { error } = await supabase.rpc('send_friend_request', { p_username: username });
    if (error) return { ok: false, error: error.message };
    await refresh();
    return { ok: true };
  };

  const acceptRequest = async (userId: string): Promise<boolean> => {
    if (!user || !supabase) return false;
    const { error } = await supabase.rpc('respond_friend_request', { p_requester_id: userId, p_accept: true });
    if (error) return false;
    await refresh();
    return true;
  };

  const declineRequest = async (userId: string): Promise<boolean> => {
    if (!user || !supabase) return false;
    const { error } = await supabase.rpc('respond_friend_request', { p_requester_id: userId, p_accept: false });
    if (error) return false;
    await refresh();
    return true;
  };

  const removeFriend = async (userId: string): Promise<boolean> => {
    if (!user || !supabase) return false;
    const { error } = await supabase.rpc('remove_friend', { p_other_user_id: userId });
    if (error) return false;
    await refresh();
    return true;
  };

  return (
    <FriendsContext.Provider
      value={{
        friends,
        incomingRequests,
        outgoingRequests,
        loading,
        refresh,
        sendRequest,
        acceptRequest,
        declineRequest,
        removeFriend,
      }}
    >
      {children}
    </FriendsContext.Provider>
  );
}
