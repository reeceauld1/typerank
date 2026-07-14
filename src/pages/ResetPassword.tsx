import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';

export default function ResetPassword() {
  const { user, loading, isConfigured, updatePassword } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    const { error: updateError } = await updatePassword(password);
    setSubmitting(false);
    if (updateError) {
      setError(updateError);
      return;
    }
    setDone(true);
  };

  if (!isConfigured) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 pb-16">
        <p className="text-[var(--text-correct)] font-semibold">Accounts aren't set up yet</p>
        <p className="text-[var(--text-muted)] text-sm max-w-md">
          This deployment hasn't been connected to Supabase, so password reset isn't available.
        </p>
      </div>
    );
  }

  if (loading) return null;

  if (!user) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 pb-16">
        <p className="text-[var(--text-correct)] font-semibold">This reset link is invalid or has expired</p>
        <p className="text-[var(--text-muted)] text-sm max-w-sm">
          Request a new one from the sign-in page's "forgot password?" link.
        </p>
        <Link
          to="/profile"
          className="text-sm border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)] text-[var(--text-secondary)] px-4 py-2 rounded-lg transition-colors"
        >
          back to profile
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 pb-16">
      <div className="w-full max-w-sm mx-auto bg-[var(--surface)] border border-[var(--border)] rounded-xl p-8">
        <h2 className="text-xl font-semibold tracking-tight text-[var(--text-correct)] mb-1">set a new password</h2>
        <p className="text-[var(--text-muted)] text-sm mb-6">for {user.email}</p>

        {done ? (
          <div className="flex flex-col gap-4">
            <p className="text-[var(--accent)] text-sm">Password updated.</p>
            <Link
              to="/profile"
              className="w-full text-center bg-[var(--accent)] hover:brightness-110 text-[var(--bg)] px-6 py-2.5 rounded-lg font-semibold transition-all"
            >
              go to profile
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="password"
              required
              minLength={6}
              placeholder="new password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg px-4 py-2.5 text-sm text-[var(--text-correct)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
            />
            <input
              type="password"
              required
              minLength={6}
              placeholder="confirm new password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg px-4 py-2.5 text-sm text-[var(--text-correct)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
            />

            {error && <p className="text-[var(--text-incorrect)] text-xs">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="mt-2 w-full bg-[var(--accent)] hover:brightness-110 disabled:opacity-50 text-[var(--bg)] px-6 py-2.5 rounded-lg font-semibold transition-all cursor-pointer"
            >
              {submitting ? '...' : 'update password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
