import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';

const LAST_UPDATED = 'July 15, 2026';

export default function PrivacyPolicy() {
  useDocumentTitle('privacy policy');
  return (
    <div className="flex-1 flex flex-col py-10 px-6">
      <div className="max-w-3xl w-full mx-auto flex items-center justify-between mb-8">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--text-correct)]">privacy policy</h1>
        <Link
          to="/settings"
          className="text-sm border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)] text-[var(--text-secondary)] px-4 py-2 rounded-lg transition-colors"
        >
          back to settings
        </Link>
      </div>

      <div className="max-w-3xl w-full mx-auto flex flex-col gap-6 text-sm text-[var(--text-secondary)] leading-relaxed">
        <p className="text-[var(--text-muted)] text-xs">Last updated: {LAST_UPDATED}</p>

        <section>
          <h2 className="text-[var(--text-correct)] font-semibold mb-2">What we collect</h2>
          <p>
            If you create an account, we collect your email address, a username you choose, and a password (handled
            entirely by our authentication provider, Supabase — we never see or store your password ourselves). We
            also store your typing test results (WPM, accuracy, mode, and timestamp), your level and total XP, and
            which cosmetics (avatars, borders, accent colors, name colors) you've unlocked and equipped.
          </p>
          <p className="mt-3">
            Duels work without an account too. If you start or join one as a guest, we store the display name you
            type in and your typing results (WPM, accuracy, time) for that duel, tied to a random token kept in your
            browser rather than to any personal identity — we don't know who you are beyond that name. If you're
            signed in, your duel results are tied to your account like any other test.
          </p>
          <p className="mt-3">
            Ranked matches pair you with a random opponent near your skill level instead of someone you chose — this
            requires an account (no guest option, since your rating needs to persist between matches). We store your
            elo rating, rank tier progress, and the results (WPM, accuracy, opponent, outcome) of each ranked match.
          </p>
        </section>

        <section>
          <h2 className="text-[var(--text-correct)] font-semibold mb-2">How it's used</h2>
          <p>
            Your data is used to track your progress and stats, save your test history, run the daily and weekly
            challenges, power the friends system, and show your scores on the leaderboard. We don't sell your data or
            use it for advertising — there are no ads on this site, and the only tracking is the optional analytics
            described below.
          </p>
        </section>

        <section>
          <h2 className="text-[var(--text-correct)] font-semibold mb-2">What's public</h2>
          <p>
            Your username, level, equipped cosmetics, and best WPM scores are visible to other users — on the
            leaderboard, your profile page, and to anyone you add as a friend (or who finds you by username search).
            Whoever you duel — including a stranger via a shared link — sees your name (or username, if signed in)
            and results for that duel. Your elo rating and rank tier are visible on the ranked leaderboard and to
            whoever you're matched against. Your email address is never shown to other users.
          </p>
        </section>

        <section>
          <h2 className="text-[var(--text-correct)] font-semibold mb-2">Cookies and local storage</h2>
          <p>
            We use your browser's local storage to remember your preferences — theme, font, keyboard layout, and
            similar settings — and to keep you signed in. This is all functional, not tracking, and doesn't require
            consent.
          </p>
        </section>

        <section>
          <h2 className="text-[var(--text-correct)] font-semibold mb-2">Analytics</h2>
          <p>
            If you accept the cookie banner, we use Google Analytics to understand how the site is used — pages
            visited, device/browser type, and general usage patterns. Google Analytics only loads after you accept;
            if you decline (or don't respond), it never runs. You can change your mind at any time by clearing your
            browser's local storage for this site. See{' '}
            <a
              href="https://policies.google.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--accent)] hover:underline"
            >
              Google's privacy policy
            </a>{' '}
            for how they handle this data.
          </p>
        </section>

        <section>
          <h2 className="text-[var(--text-correct)] font-semibold mb-2">Third parties</h2>
          <p>
            We use Supabase to handle authentication and store your account data, Hostinger to send account emails
            (confirmation, password reset) from info@typeladder.com, and — only if you accept analytics cookies —
            Google Analytics to understand site usage.
          </p>
        </section>

        <section>
          <h2 className="text-[var(--text-correct)] font-semibold mb-2">Your data, your choice</h2>
          <p>
            You can delete your test history from your profile at any time. You can also delete your account
            entirely, yourself, from your profile page — this permanently removes your account and everything tied
            to it (stats, test history, friends, duels, ranked data) and can't be undone. To ask what data we hold
            about you, email us at{' '}
            <a href="mailto:contact@typeladder.com" className="text-[var(--accent)] hover:underline">
              contact@typeladder.com
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-[var(--text-correct)] font-semibold mb-2">Children's privacy</h2>
          <p>This site is intended for users aged 13 and over. We don't knowingly collect data from children under 13.</p>
        </section>

        <section>
          <h2 className="text-[var(--text-correct)] font-semibold mb-2">Changes to this policy</h2>
          <p>
            If this policy changes, we'll update the date above. Continuing to use the site after a change means you
            accept the update.
          </p>
        </section>

        <section>
          <h2 className="text-[var(--text-correct)] font-semibold mb-2">Contact</h2>
          <p>
            Questions about this policy or your data?{' '}
            <a href="mailto:contact@typeladder.com" className="text-[var(--accent)] hover:underline">
              contact@typeladder.com
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
