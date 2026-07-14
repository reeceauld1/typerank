import { Link } from 'react-router-dom';

function EmailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <path d="M17.5 6.5h.01" />
    </svg>
  );
}

function TwitterIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M21 5c-.8.5-1.7.8-2.6 1a4 4 0 0 0-6.9 3.6A11.4 11.4 0 0 1 3.3 4.8a4 4 0 0 0 1.2 5.3c-.7 0-1.4-.2-2-.5v.1a4 4 0 0 0 3.2 3.9 4 4 0 0 1-1.8.1 4 4 0 0 0 3.7 2.8A8 8 0 0 1 2 18.4a11.3 11.3 0 0 0 6.1 1.8c7.3 0 11.3-6.1 11.3-11.3v-.5c.8-.6 1.5-1.3 2-2.1Z" />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M15 3v10.5a3.5 3.5 0 1 1-3.5-3.5" />
      <path d="M15 3a5 5 0 0 0 5 5" />
    </svg>
  );
}

function PadlockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <rect x="5" y="11" width="14" height="9" rx="1.5" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

const LINK_CLASS = 'flex items-center gap-1.5 text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors';

export default function Footer() {
  return (
    <footer className="py-6 px-6">
      <div className="flex flex-wrap items-center justify-start gap-x-6 gap-y-2 text-xs">
        <a href="https://instagram.com/typeladder" target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
          <InstagramIcon />
          instagram
        </a>
        <a href="https://twitter.com/typeladder" target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
          <TwitterIcon />
          twitter
        </a>
        <a href="https://tiktok.com/@typeladder" target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
          <TikTokIcon />
          tiktok
        </a>
        <a href="mailto:contact@typeladder.com" className={LINK_CLASS}>
          <EmailIcon />
          contact
        </a>
        <Link to="/privacy" className={LINK_CLASS}>
          <PadlockIcon />
          privacy
        </Link>
      </div>
    </footer>
  );
}
