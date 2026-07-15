import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { loadGoogleAnalytics } from '../utils/analytics.js';

const CONSENT_KEY = 'analyticsConsent';

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(CONSENT_KEY);
    } catch {
      // ignore unavailable storage
    }

    if (stored === 'granted') {
      loadGoogleAnalytics();
    } else if (stored !== 'denied') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVisible(true);
    }
  }, []);

  const respond = (consent: 'granted' | 'denied') => {
    try {
      window.localStorage.setItem(CONSENT_KEY, consent);
    } catch {
      // ignore unavailable storage
    }
    if (consent === 'granted') loadGoogleAnalytics();
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--border)] bg-[var(--surface)] px-6 py-4">
      <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-[var(--text-secondary)]">
          We use Google Analytics to understand how the site is used. See our{' '}
          <Link to="/privacy" className="text-[var(--accent)] hover:underline">
            privacy policy
          </Link>
          .
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => respond('denied')}
            className="text-sm border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)] text-[var(--text-secondary)] px-4 py-2 rounded-lg transition-colors cursor-pointer"
          >
            decline
          </button>
          <button
            type="button"
            onClick={() => respond('granted')}
            className="text-sm bg-[var(--accent)] hover:brightness-110 text-[var(--bg)] px-4 py-2 rounded-lg font-semibold transition-all cursor-pointer"
          >
            accept
          </button>
        </div>
      </div>
    </div>
  );
}
