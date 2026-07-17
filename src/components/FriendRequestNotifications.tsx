import { useState } from 'react';
import { useFriends } from '../hooks/useFriends.js';
import Avatar from './Avatar.js';
import UsernameText from './UsernameText.js';
import UsernameBadge from './UsernameBadge.js';

// FriendsContext already tracks incomingRequests reactively (realtime-backed,
// see FriendsContext.tsx) and refreshes itself on accept/decline — this just
// surfaces whatever's currently pending as a notification card wherever the
// user is on the site, instead of only on the Friends page's own inbox tab.
export default function FriendRequestNotifications() {
  const { incomingRequests, acceptRequest, declineRequest } = useFriends();
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const respond = async (userId: string, accept: boolean) => {
    setRespondingId(userId);
    await (accept ? acceptRequest(userId) : declineRequest(userId));
    setRespondingId(null);
  };

  if (incomingRequests.length === 0) return null;

  return (
    <>
      {incomingRequests.map(req => (
        <div key={req.userId} className="pointer-events-auto w-full sm:w-72 bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3 shadow-lg">
          <div className="flex items-center gap-2 mb-2 min-w-0">
            <Avatar avatarId={req.equippedAvatar} borderId={req.equippedBorder} discordAvatarUrl={req.discordAvatarUrl} size="sm" />
            <div className="flex items-center gap-1.5 min-w-0">
              <UsernameText username={req.username} colorId={req.equippedNameColor} className="text-sm truncate" />
              <UsernameBadge badgeId={req.equippedBadge} />
            </div>
          </div>
          <p className="text-sm text-[var(--text-correct)] mb-2">sent you a friend request.</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={respondingId === req.userId}
              onClick={() => void respond(req.userId, false)}
              className="text-xs border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)] text-[var(--text-secondary)] px-3 py-1.5 rounded-md transition-colors cursor-pointer disabled:opacity-50"
            >
              decline
            </button>
            <button
              type="button"
              disabled={respondingId === req.userId}
              onClick={() => void respond(req.userId, true)}
              className="text-xs bg-[var(--accent)] hover:brightness-110 disabled:opacity-50 text-[var(--bg)] px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer"
            >
              {respondingId === req.userId ? '...' : 'accept'}
            </button>
          </div>
        </div>
      ))}
    </>
  );
}
