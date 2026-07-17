import { Link, useNavigate } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';

const LAST_UPDATED = 'July 17, 2026';

export default function PrivacyPolicy() {
  useDocumentTitle('privacy policy', "typeladder's privacy policy - what data we collect, why, and how it's used.");
  const navigate = useNavigate();
  return (
    <div className="flex-1 flex flex-col py-10 px-6">
      <div className="max-w-3xl w-full mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-8">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--text-correct)]">privacy policy</h1>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="text-sm border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)] text-[var(--text-secondary)] px-4 py-2 rounded-lg transition-colors cursor-pointer"
        >
          back
        </button>
      </div>

      <div className="max-w-3xl w-full mx-auto flex flex-col gap-6 text-sm text-[var(--text-secondary)] leading-relaxed">
        <p className="text-[var(--text-muted)] text-xs">Last updated: {LAST_UPDATED}</p>

        <section>
          <h2 className="text-[var(--text-correct)] font-semibold mb-2">What we collect</h2>
          <p>
            If you create an account, we collect your email address, a username you choose, and a password (handled
            entirely by our authentication provider, Supabase - we never see or store your password ourselves). We
            also store your typing test results (WPM, accuracy, mode, and timestamp), your level and total XP, and
            which cosmetics (avatars, borders, accent colors, name colors, and badges) you've unlocked and equipped.
          </p>
          <p className="mt-3">
            Duels work without an account too. If you start or join one as a guest, we store the display name you
            type in and your typing results (WPM, accuracy, time) for that duel, tied to a random token kept in your
            browser rather than to any personal identity - we don't know who you are beyond that name. If you're
            signed in, your duel results are tied to your account like any other test.
          </p>
          <p className="mt-3">
            Ranked matches pair you with a random opponent near your skill level instead of someone you chose - this
            requires an account (no guest option, since your rating needs to persist between matches). We store your
            elo rating, rank tier progress, and the results (WPM, accuracy, opponent, outcome) of each ranked match.
          </p>
          <p className="mt-3">
            You can optionally link a Discord account from your profile page (this only attaches Discord to an
            existing account - there's no way to sign up or log in with Discord directly). Doing so shares your
            Discord username, avatar, and email with Supabase (our authentication provider) to create the connection.
            If you choose to use your Discord picture as your typeladder avatar, we also store that image's URL.
            Unlinking Discord removes the connection and that stored image URL from your account.
          </p>
          <p className="mt-3">
            Some badges are earned automatically from your stats (being an early account, or a top score). If you
            support the project through Ko-fi, we don't automatically receive or store any payment or donation
            details from that - the Supporter badge is only added to your account by hand, after you let us know
            which account is yours.
          </p>
          <p className="mt-3">
            Learn mode (letter-by-letter typing practice) works without an account too. Signed in, we store which
            letters you've unlocked and your per-letter accuracy so it follows you across devices. As a guest, that
            same data stays in your browser's local storage only - we never see it.
          </p>
          <p className="mt-3">
            If you submit a bug report or a message through the contact form, we store what you wrote, your account
            (if you're signed in - otherwise nothing identifying), the reply email you optionally give us, and the
            page/browser you sent it from, so we can follow up and fix things. These are readable only by us, not by
            other users.
          </p>
        </section>

        <section>
          <h2 className="text-[var(--text-correct)] font-semibold mb-2">How it's used</h2>
          <p>
            Your data is used to track your progress and stats, save your test history, run the hourly, daily, and
            weekly challenges, power the friends system, and show your scores on the leaderboard. We don't sell your data or
            use it for advertising - there are no ads on this site, and the only tracking is the optional analytics
            described below.
          </p>
        </section>

        <section>
          <h2 className="text-[var(--text-correct)] font-semibold mb-2">What's public</h2>
          <p>
            Your username, level, equipped cosmetics (including any badges), and best WPM scores are visible to other users - on the
            leaderboard, your profile page, and to anyone you add as a friend (or who finds you by username search).
            Whoever you duel - including a stranger via a shared link - sees your name (or username, if signed in)
            and results for that duel. Your elo rating and rank tier are visible on the ranked leaderboard and to
            whoever you're matched against. Your profile also shows a calendar-style chart of how many tests you
            completed on each of the last 365 days - this daily count is visible to anyone who views your profile,
            the same way your total tests and best WPM already are, though the individual tests themselves (their
            exact time, WPM, and accuracy) are not. If you've linked Discord and use it as your avatar, that picture
            is likewise public. Your email address is never shown to other users.
          </p>
        </section>

        <section>
          <h2 className="text-[var(--text-correct)] font-semibold mb-2">Cookies and local storage</h2>
          <p>
            We use your browser's local storage to remember your preferences - theme, font, keyboard layout, and
            similar settings - and to keep you signed in. This is all functional, not tracking, and doesn't require
            consent.
          </p>
        </section>

        <section>
          <h2 className="text-[var(--text-correct)] font-semibold mb-2">Analytics</h2>
          <p>
            If you accept the cookie banner, we use Google Analytics to understand how the site is used - pages
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
            We use Supabase to handle authentication and store your account data, Discord (only if you choose to link
            it) to verify your identity and retrieve your avatar, Hostinger to send account emails
            (confirmation, password reset) from info@typeladder.com, and - only if you accept analytics cookies -
            Google Analytics to understand site usage.
          </p>
        </section>

        <section>
          <h2 className="text-[var(--text-correct)] font-semibold mb-2">Your data, your choice</h2>
          <p>
            You can delete your test history from your profile at any time. You can also delete your account
            entirely, yourself, from your profile page - this permanently removes your account and everything tied
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
            Questions about this policy or your data? Use the{' '}
            <Link to="/contact" className="text-[var(--accent)] hover:underline">
              contact form
            </Link>{' '}
            or email{' '}
            <a href="mailto:contact@typeladder.com" className="text-[var(--accent)] hover:underline">
              contact@typeladder.com
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
