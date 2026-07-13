import { Link } from 'react-router-dom';
import ProfileStats from '../components/ProfileStats.js';
import AuthForm from '../components/AuthForm.js';
import { useAuth } from '../hooks/useAuth.js';

export default function Profile() {
  const { user, isConfigured, signOut } = useAuth();

  return (
    <div className="flex-1 flex flex-col py-10 px-6">
      <div className="max-w-4xl w-full mx-auto flex items-center justify-between mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--text-correct)]">profile</h1>
        <Link
          to="/"
          className="text-sm border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)] text-[var(--text-secondary)] px-4 py-2 rounded-lg transition-colors"
        >
          back to test
        </Link>
      </div>

      {user ? (
        <>
          <div className="max-w-4xl w-full mx-auto mb-6">
            <div className="flex items-center justify-between bg-[var(--surface)] border border-[var(--border)] rounded-xl px-6 py-4">
              <p className="text-[var(--text-correct)] font-semibold">
                {(user.user_metadata?.username as string | undefined) ?? 'account'}
              </p>
              <button
                onClick={() => signOut()}
                className="text-sm border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)] text-[var(--text-secondary)] px-4 py-2 rounded-lg transition-colors cursor-pointer"
              >
                sign out
              </button>
            </div>
          </div>
          <ProfileStats />
        </>
      ) : isConfigured ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 pb-16">
          <p className="text-[var(--text-muted)] text-sm text-center max-w-sm">
            log in to track your stats — level, personal bests, and test history are only saved for signed-in accounts —
            and unlock daily and weekly challenges.
          </p>
          <AuthForm />
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 pb-16">
          <p className="text-[var(--text-correct)] font-semibold">Accounts aren't set up yet</p>
          <p className="text-[var(--text-muted)] text-sm max-w-md">
            This deployment hasn't been connected to Supabase, so sign-in isn't available.
          </p>
        </div>
      )}
    </div>
  );
}
