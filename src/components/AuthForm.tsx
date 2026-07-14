import { useState } from 'react';
import { useAuth } from '../hooks/useAuth.js';
import { supabase } from '../lib/supabase.js';

const USERNAME_PATTERN = /^[A-Za-z0-9]+$/;

function validateUsername(username: string): string | null {
  if (username.length < 3) return 'Username must be at least 3 characters.';
  if (username.length > 20) return 'Username must be 20 characters or fewer.';
  if (!USERNAME_PATTERN.test(username)) return 'Username can only contain letters and numbers.';
  return null;
}

type Mode = 'signin' | 'signup' | 'forgot';

interface AuthFormProps {
  initialMode?: 'signin' | 'signup';
}

export default function AuthForm({ initialMode = 'signin' }: AuthFormProps = {}) {
  const { signUp, signIn, sendPasswordReset } = useAuth();

  const [mode, setMode] = useState<Mode>(initialMode);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setInfo(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setSubmitting(true);

    if (mode === 'forgot') {
      await sendPasswordReset(identifier.trim());
      setSubmitting(false);
      setInfo("If that account exists, we've sent a password reset link to its email.");
      return;
    }

    if (mode === 'signup') {
      const trimmedUsername = username.trim();
      const usernameError = validateUsername(trimmedUsername);
      if (usernameError) {
        setError(usernameError);
        setSubmitting(false);
        return;
      }

      if (supabase) {
        const { data: available, error: checkError } = await supabase.rpc('is_username_available', {
          p_username: trimmedUsername,
        });
        if (checkError) {
          setError('Could not verify username availability. Try again.');
          setSubmitting(false);
          return;
        }
        if (!available) {
          setError('That username is already taken.');
          setSubmitting(false);
          return;
        }
      }

      const { error: signUpError } = await signUp(email, password, trimmedUsername);
      if (signUpError) {
        // Rare race: someone else claimed the username between the check
        // above and this call. The DB rejects it, but Auth only surfaces a
        // generic failure, so map it to something the user can act on.
        setError(/database error/i.test(signUpError) ? 'That username was just taken — try another.' : signUpError);
        setSubmitting(false);
        return;
      }
      setInfo('Check your email to confirm your account, then sign in.');
      setMode('signin');
      setSubmitting(false);
      return;
    }

    const { error: signInError } = await signIn(identifier.trim(), password);
    setSubmitting(false);
    if (signInError) {
      setError(signInError);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto bg-[var(--surface)] border border-[var(--border)] rounded-xl p-8">
      <h2 className="text-xl font-semibold tracking-tight text-[var(--text-correct)] mb-1">
        {mode === 'signup' ? 'create account' : mode === 'forgot' ? 'reset password' : 'sign in'}
      </h2>
      <p className="text-[var(--text-muted)] text-sm mb-6">
        {mode === 'signup'
          ? 'sign up to track your level, unlock cosmetics, add friends, and climb the leaderboard'
          : mode === 'forgot'
            ? "we'll email you a reset link"
            : 'sign in to track your level, unlock cosmetics, add friends, and climb the leaderboard'}
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {mode === 'signup' && (
          <input
            type="text"
            required
            maxLength={20}
            placeholder="username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg px-4 py-2.5 text-sm text-[var(--text-correct)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
          />
        )}

        {mode === 'signup' ? (
          <input
            type="email"
            required
            placeholder="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg px-4 py-2.5 text-sm text-[var(--text-correct)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
          />
        ) : (
          <input
            type="text"
            required
            placeholder="email or username"
            value={identifier}
            onChange={e => setIdentifier(e.target.value)}
            className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg px-4 py-2.5 text-sm text-[var(--text-correct)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
          />
        )}

        {mode !== 'forgot' && (
          <input
            type="password"
            required
            minLength={6}
            placeholder="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg px-4 py-2.5 text-sm text-[var(--text-correct)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
          />
        )}

        {mode === 'signin' && (
          <button
            type="button"
            onClick={() => switchMode('forgot')}
            className="self-end -mt-1 text-xs text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors cursor-pointer"
          >
            forgot password?
          </button>
        )}

        {error && <p className="text-[var(--text-incorrect)] text-xs">{error}</p>}
        {info && <p className="text-[var(--accent)] text-xs">{info}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 w-full bg-[var(--accent)] hover:brightness-110 disabled:opacity-50 text-[var(--bg)] px-6 py-2.5 rounded-lg font-semibold transition-all cursor-pointer"
        >
          {submitting ? '...' : mode === 'signup' ? 'sign up' : mode === 'forgot' ? 'send reset link' : 'sign in'}
        </button>
      </form>

      {mode === 'forgot' ? (
        <button
          type="button"
          onClick={() => switchMode('signin')}
          className="mt-6 -mb-8 h-16 w-full flex items-center justify-center border-t border-[var(--border)] text-center text-sm text-[var(--text-secondary)] hover:text-[var(--text-correct)] transition-colors cursor-pointer"
        >
          back to <span className="ml-1 text-[var(--accent)] font-semibold">sign in</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => switchMode(mode === 'signup' ? 'signin' : 'signup')}
          className="mt-6 -mb-8 h-16 w-full flex items-center justify-center border-t border-[var(--border)] text-center text-sm text-[var(--text-secondary)] hover:text-[var(--text-correct)] transition-colors cursor-pointer"
        >
          {mode === 'signup' ? (
            <>
              already have an account?
              <span className="ml-1 text-[var(--accent)] font-semibold">sign in</span>
            </>
          ) : (
            <>
              need an account?
              <span className="ml-1 text-[var(--accent)] font-semibold">sign up</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
