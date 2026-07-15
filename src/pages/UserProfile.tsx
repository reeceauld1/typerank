import { useState, useEffect, useCallback } from 'react';
import { Link, Navigate, useLocation, useParams } from 'react-router-dom';
import type { UserStats } from '../types/index.js';
import { mapStatsRow } from '../utils/statsMapping.js';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../hooks/useAuth.js';
import { useFriends } from '../hooks/useFriends.js';
import Avatar from '../components/Avatar.js';
import ProfileStats from '../components/ProfileStats.js';
import CosmeticsPicker from '../components/CosmeticsPicker.js';
import UsernameText from '../components/UsernameText.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';

interface TargetProfile {
  userId: string;
  username: string;
  stats: UserStats;
}

export default function UserProfile() {
  const { username } = useParams<{ username: string }>();
  useDocumentTitle(username ? `${username}'s profile` : 'profile');
  const location = useLocation();
  const { user } = useAuth();
  const { friends, incomingRequests, outgoingRequests, sendRequest, acceptRequest, declineRequest, removeFriend } = useFriends();

  // Only takes you back to the leaderboard if that's actually where you came
  // from (via the state the Leaderboard page's link sets) — otherwise this
  // defaults to friends, matching every other way of reaching a profile.
  const cameFromLeaderboard = (location.state as { from?: string } | null)?.from === 'leaderboard';
  const backTo = cameFromLeaderboard ? '/leaderboard' : '/friends';
  const backLabel = cameFromLeaderboard ? 'back to leaderboard' : 'back to friends';

  const [profile, setProfile] = useState<TargetProfile | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const loadProfile = useCallback(async (targetUsername: string) => {
    setNotFound(false);
    setMessage(null);
    setProfile(null);

    if (!supabase || !targetUsername) {
      setNotFound(true);
      return;
    }
    const { data } = await supabase.from('user_stats').select('*').ilike('username', targetUsername).maybeSingle();
    if (!data) {
      setNotFound(true);
    } else {
      setProfile({
        userId: data.user_id as string,
        username: data.username as string,
        stats: { ...mapStatsRow(data as Record<string, number | string>), testHistory: [] },
      });
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    loadProfile(username ?? '').finally(() => setLoading(false));
  }, [username, loadProfile]);

  if (loading) return null;

  if (notFound || !profile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 pb-16">
        <p className="text-[var(--text-correct)] font-semibold">User not found</p>
        <Link to={backTo} className="text-sm text-[var(--accent)] hover:underline">
          {backLabel}
        </Link>
      </div>
    );
  }

  if (user && user.id === profile.userId) {
    return <Navigate to="/profile" replace />;
  }

  const status = friends.some(f => f.userId === profile.userId)
    ? 'friend'
    : incomingRequests.some(f => f.userId === profile.userId)
      ? 'incoming'
      : outgoingRequests.some(f => f.userId === profile.userId)
        ? 'outgoing'
        : null;

  const handleAdd = async () => {
    setMessage(null);
    const result = await sendRequest(profile.username);
    setMessage(result.ok ? 'Friend request sent.' : (result.error ?? 'Something went wrong.'));
  };

  return (
    <div className="flex-1 flex flex-col py-10 px-6">
      <div className="max-w-4xl w-full mx-auto flex items-center justify-between mb-8">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--text-correct)]">profile</h1>
        <Link
          to={backTo}
          className="text-sm border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)] text-[var(--text-secondary)] px-4 py-2 rounded-lg transition-colors"
        >
          {backLabel}
        </Link>
      </div>

      <div className="max-w-4xl w-full mx-auto mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl px-6 py-4">
          <div className="flex items-center gap-4 min-w-0">
            <Avatar avatarId={profile.stats.equippedAvatar} borderId={profile.stats.equippedBorder} size="md" />
            <p className="truncate">
              <UsernameText username={profile.username} colorId={profile.stats.equippedNameColor} />
            </p>
          </div>

          {user && (
            <div className="flex items-center gap-2 shrink-0">
              {status === 'friend' && (
                <button
                  onClick={() => void removeFriend(profile.userId)}
                  className="text-sm border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)] text-[var(--text-secondary)] px-4 py-2 rounded-lg transition-colors cursor-pointer"
                >
                  remove friend
                </button>
              )}
              {status === 'outgoing' && (
                <button
                  onClick={() => void removeFriend(profile.userId)}
                  className="text-sm border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)] text-[var(--text-secondary)] px-4 py-2 rounded-lg transition-colors cursor-pointer"
                >
                  cancel request
                </button>
              )}
              {status === 'incoming' && (
                <>
                  <button
                    onClick={() => void acceptRequest(profile.userId)}
                    className="text-sm border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent-soft)] px-4 py-2 rounded-lg transition-colors cursor-pointer"
                  >
                    accept
                  </button>
                  <button
                    onClick={() => void declineRequest(profile.userId)}
                    className="text-sm border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)] text-[var(--text-secondary)] px-4 py-2 rounded-lg transition-colors cursor-pointer"
                  >
                    decline
                  </button>
                </>
              )}
              {status === null && (
                <button
                  onClick={() => void handleAdd()}
                  className="text-sm border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent-soft)] px-4 py-2 rounded-lg transition-colors cursor-pointer"
                >
                  add friend
                </button>
              )}
            </div>
          )}
        </div>
        {message && <p className="text-sm text-[var(--text-muted)] mt-2">{message}</p>}
      </div>

      <ProfileStats stats={profile.stats} />
      <div className="mt-6">
        <CosmeticsPicker statsOverride={profile.stats} readOnly />
      </div>
    </div>
  );
}
