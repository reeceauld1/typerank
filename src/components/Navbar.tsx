import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
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

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 13a7.6 7.6 0 0 0 0-2l2-1.5-2-3.4-2.3.9a7.6 7.6 0 0 0-1.7-1l-.3-2.5H9.9l-.3 2.5a7.6 7.6 0 0 0-1.7 1l-2.3-.9-2 3.4L5.6 11a7.6 7.6 0 0 0 0 2l-2 1.5 2 3.4 2.3-.9a7.6 7.6 0 0 0 1.7 1l.3 2.5h4.2l.3-2.5a7.6 7.6 0 0 0 1.7-1l2.3.9 2-3.4-2-1.5Z" />
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M7 4h10v4a5 5 0 0 1-10 0V4Z" />
      <path d="M7 5H4a3 3 0 0 0 3 5M17 5h3a3 3 0 0 1-3 5" />
      <path d="M12 13v3M9 20h6M9 20c0-2 1-2 3-2s3 0 3 2" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
      <path d="M3.5 6.5h17M3.5 12h17M3.5 17.5h17" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
      <path d="M5 5l14 14M19 5 5 19" />
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

function DuelIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M4 4l7 7M20 4l-7 7M4 20l7-7M20 20l-7-7" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

interface NavItem {
  to: string;
  label: string;
  icon: () => ReactElement;
  isActive: (pathname: string) => boolean;
  requiresUser?: boolean;
}

export default function Navbar() {
  const location = useLocation();
  const { lastXpGained, clearLastXpGained } = useUser();
  const { user } = useAuth();
  const { incomingRequests } = useFriends();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (lastXpGained === null) return;
    const timer = setTimeout(clearLastXpGained, 2600);
    return () => clearTimeout(timer);
  }, [lastXpGained, clearLastXpGained]);

  // Closes the mobile drawer on navigation, so it doesn't stay open over
  // the page you just tapped through to.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const navItems: NavItem[] = [
    { to: '/', label: 'typing test', icon: KeyboardIcon, isActive: p => p === '/' },
    { to: '/challenges', label: 'challenges', icon: ChallengeIcon, isActive: p => p === '/challenges', requiresUser: true },
    { to: '/leaderboard', label: 'leaderboard', icon: TrophyIcon, isActive: p => p === '/leaderboard' },
    {
      to: '/friends',
      label: 'friends',
      icon: FriendsIcon,
      isActive: p => p === '/friends' || p.startsWith('/u/'),
      requiresUser: true,
    },
    { to: '/duel', label: 'duel', icon: DuelIcon, isActive: p => p.startsWith('/duel'), requiresUser: true },
    { to: '/profile', label: 'profile', icon: ProfileIcon, isActive: p => p === '/profile' },
    { to: '/settings', label: 'settings', icon: SettingsIcon, isActive: p => p === '/settings' },
  ];
  const visibleNavItems = navItems.filter(item => !item.requiresUser || user);

  return (
    <>
    <nav className="border-b border-[var(--border)] bg-[var(--bg)]/80 backdrop-blur-sm relative z-10">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="text-lg font-semibold tracking-tight text-[var(--accent)]">
          type<span className="text-[var(--text-correct)]">ladder</span>
        </Link>

        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Open menu"
          className="sm:hidden p-1 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors cursor-pointer"
        >
          <MenuIcon />
        </button>

        <div className="hidden sm:flex items-center gap-6 text-sm">
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
          <Link
            to="/leaderboard"
            aria-label="Leaderboard"
            title="Leaderboard"
            className={`relative p-1 transition-colors ${
              location.pathname === '/leaderboard'
                ? 'text-[var(--text-correct)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            }`}
          >
            <TrophyIcon />
            {location.pathname === '/leaderboard' && (
              <span className="absolute -bottom-[5px] left-0 right-0 h-[2px] bg-[var(--accent)] rounded-full" />
            )}
          </Link>
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
          {user && (
            <Link
              to="/duel"
              aria-label="Duel"
              title="Duel"
              className={`relative p-1 transition-colors ${
                location.pathname.startsWith('/duel')
                  ? 'text-[var(--text-correct)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              <DuelIcon />
              {location.pathname.startsWith('/duel') && (
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
          <Link
            to="/settings"
            aria-label="Settings"
            title="Settings"
            className={`relative p-1 transition-colors ${
              location.pathname === '/settings'
                ? 'text-[var(--text-correct)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            }`}
          >
            <SettingsIcon />
            {location.pathname === '/settings' && (
              <span className="absolute -bottom-[5px] left-0 right-0 h-[2px] bg-[var(--accent)] rounded-full" />
            )}
          </Link>
        </div>
      </div>
    </nav>

    <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileMenuOpen(false)}
              className="sm:hidden fixed inset-0 bg-black/50 z-20"
            />
            <motion.div
              key="drawer"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="sm:hidden fixed top-0 right-0 bottom-0 w-64 max-w-[80%] bg-[var(--bg)] border-l border-[var(--border)] z-30 flex flex-col py-4"
            >
              <div className="flex items-center justify-between px-4 mb-2">
                <span className="text-sm font-semibold text-[var(--text-correct)]">menu</span>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Close menu"
                  className="p-1 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors cursor-pointer"
                >
                  <CloseIcon />
                </button>
              </div>

              {visibleNavItems.map(item => {
                const Icon = item.icon;
                const active = item.isActive(location.pathname);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`relative flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${
                      active
                        ? 'text-[var(--accent)] bg-[var(--accent-soft)]'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'
                    }`}
                  >
                    <Icon />
                    {item.label}
                    {item.to === '/friends' && incomingRequests.length > 0 && (
                      <span className="ml-auto min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-[var(--accent)] text-[10px] font-semibold leading-none text-[var(--bg)]">
                        {incomingRequests.length}
                      </span>
                    )}
                  </Link>
                );
              })}
            </motion.div>
          </>
        )}
    </AnimatePresence>
    </>
  );
}
