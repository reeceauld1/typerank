import SentDuelInviteNotifications from './SentDuelInviteNotifications.js';
import IncomingDuelInviteNotifications from './IncomingDuelInviteNotifications.js';
import ActiveDuelPresence from './ActiveDuelPresence.js';
import FriendRequestNotifications from './FriendRequestNotifications.js';

// Mounted once at the app root (see App.tsx), outside <Routes> so it
// survives route navigation — the whole point is that a sent duel invite,
// an incoming challenge, or a friend request stays visible no matter what
// page you wander off to. The wrapper itself ignores pointer events so empty
// space beside the cards doesn't block clicks on the page underneath; each
// card opts back in individually.
export default function NotificationStack() {
  return (
    <div className="fixed top-4 right-4 left-4 sm:left-auto z-40 flex flex-col items-end gap-2 pointer-events-none">
      <SentDuelInviteNotifications />
      <IncomingDuelInviteNotifications />
      <ActiveDuelPresence />
      <FriendRequestNotifications />
    </div>
  );
}
