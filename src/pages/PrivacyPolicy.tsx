import { Link } from 'react-router-dom';

const LAST_UPDATED = 'July 15, 2026';

export default function PrivacyPolicy() {
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
            which cosmetics (avatars, borders, accent colors) you've unlocked and equipped.
          </p>
        </section>

        <section>
          <h2 className="text-[var(--text-correct)] font-semibold mb-2">How it's used</h2>
          <p>
            Your data is used to track your progress and stats, save your test history, run the daily and weekly
            challenges, power the friends system, and show your scores on the leaderboard. We don't sell your data or
            use it for advertising — there are no ads or trackers on this site.
          </p>
        </section>

        <section>
          <h2 className="text-[var(--text-correct)] font-semibold mb-2">What's public</h2>
          <p>
            Your username, level, equipped cosmetics, and best WPM scores are visible to other users — on the
            leaderboard, your profile page, and to anyone you add as a friend (or who finds you by username search).
            Your email address is never shown to other users.
          </p>
        </section>

        <section>
          <h2 className="text-[var(--text-correct)] font-semibold mb-2">Cookies and local storage</h2>
          <p>
            We use your browser's local storage to remember your preferences — theme, font, keyboard layout, and
            similar settings — and to keep you signed in. This is all functional, not tracking: we don't use
            third-party analytics or advertising cookies.
          </p>
        </section>

        <section>
          <h2 className="text-[var(--text-correct)] font-semibold mb-2">Third parties</h2>
          <p>
            We use Supabase to handle authentication and store your account data, and Hostinger to send account
            emails (confirmation, password reset) from info@typeladder.com. Neither is used for anything beyond
            running the site.
          </p>
        </section>

        <section>
          <h2 className="text-[var(--text-correct)] font-semibold mb-2">Your data, your choice</h2>
          <p>
            You can delete your test history from your profile at any time. To delete your account entirely, or to
            ask what data we hold about you, email us at{' '}
            <a href="mailto:info@typeladder.com" className="text-[var(--accent)] hover:underline">
              info@typeladder.com
            </a>{' '}
            and we'll take care of it.
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
            <a href="mailto:info@typeladder.com" className="text-[var(--accent)] hover:underline">
              info@typeladder.com
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
