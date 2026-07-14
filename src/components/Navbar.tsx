import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useUser } from '../hooks/useUser.js';
import { useAuth } from '../hooks/useAuth.js';
import { useFriends } from '../hooks/useFriends.js';

function KeyboardIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <rect x="2.5" y="6" width="19" height="12" rx="2" />
      <path d="M6 10h.01M9.25 10h.01M12.5 10h.01M15.75 10h.01M19 10h.01M6.5 14h11" />
    </svg>
  );
}

function ChallengeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20c1.4-4.2 4.4-6.2 7.5-6.2s6.1 2 7.5 6.2" />
    </svg>
  );
}

function FriendsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <circle cx="8.5" cy="8" r="3" />
      <path d="M2.5 19c1.2-3.6 3.6-5.3 6-5.3s4.8 1.7 6 5.3" />
      <path d="M15.5 8.3a2.6 2.6 0 1 0 0-5.2" />
      <path d="M15 13.9c2.1.3 3.9 1.9 4.9 5.1" />
    </svg>
  );
}

export default function Navbar() {
  const location = useLocation();
  const { lastXpGained, clearLastXpGained } = useUser();
  const { user } = useAuth();
  const { incomingRequests } = useFriends();

  useEffect(() => {
    if (lastXpGained === null) return;
    const timer = setTimeout(clearLastXpGained, 2600);
    return () => clearTimeout(timer);
  }, [lastXpGained, clearLastXpGained]);

  return (
    <nav className="border-b border-[var(--border)] bg-[var(--bg)]/80 backdrop-blur-sm relative z-10">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="text-lg font-semibold tracking-tight text-[var(--accent)]">
          type<span className="text-[var(--text-correct)]">rank</span>
        </Link>

        <div className="flex items-center gap-6 text-sm">
          <Link
            to="/"
            aria-label="Typing test"
            title="Typing test"
            className={`relative p-1 transition-colors ${
              location.pathname === '/'
                ? 'text-[var(--text-correct)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            }`}
          >
            <KeyboardIcon />
            {location.pathname === '/' && (
              <span className="absolute -bottom-[5px] left-0 right-0 h-[2px] bg-[var(--accent)] rounded-full" />
            )}
          </Link>
          {user && (
            <Link
              to="/challenges"
              aria-label="Challenges"
              title="Challenges"
              className={`relative p-1 transition-colors ${
                location.pathname === '/challenges'
                  ? 'text-[var(--text-correct)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              <ChallengeIcon />
              {location.pathname === '/challenges' && (
                <span className="absolute -bottom-[5px] left-0 right-0 h-[2px] bg-[var(--accent)] rounded-full" />
              )}
            </Link>
          )}
          {user && (
            <Link
              to="/friends"
              aria-label="Friends"
              title="Friends"
              className={`relative p-1 transition-colors ${
                location.pathname === '/friends' || location.pathname.startsWith('/u/')
                  ? 'text-[var(--text-correct)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              <FriendsIcon />
              {incomingRequests.length > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-[var(--accent)] text-[10px] font-semibold leading-none text-[var(--bg)]">
                  {incomingRequests.length}
                </span>
              )}
              {(location.pathname === '/friends' || location.pathname.startsWith('/u/')) && (
                <span className="absolute -bottom-[5px] left-0 right-0 h-[2px] bg-[var(--accent)] rounded-full" />
              )}
            </Link>
          )}
          <Link
            to="/profile"
            aria-label="Profile"
            title="Profile"
            className={`relative p-1 transition-colors ${
              location.pathname === '/profile'
                ? 'text-[var(--text-correct)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            }`}
          >
            <ProfileIcon />
            {location.pathname === '/profile' && (
              <span className="absolute -bottom-[5px] left-0 right-0 h-[2px] bg-[var(--accent)] rounded-full" />
            )}
            <AnimatePresence>
              {lastXpGained !== null && (
                <motion.span
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-full left-1/2 -translate-x-1/2 mt-[26px] whitespace-nowrap text-xs font-semibold text-[var(--accent)] bg-[var(--surface)] border border-[var(--border)] rounded-full px-2 py-0.5 pointer-events-none"
                >
                  +{lastXpGained} xp
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
        </div>
      </div>
    </nav>
  );
}
