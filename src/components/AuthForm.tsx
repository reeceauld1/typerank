import { useState } from 'react';
import { useAuth } from '../hooks/useAuth.js';

export default function AuthForm() {
  const { signUp, signIn } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup'>('signup');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setSubmitting(true);

    if (mode === 'signup') {
      const trimmedUsername = username.trim();
      if (trimmedUsername.length < 3) {
        setError('Username must be at least 3 characters.');
        setSubmitting(false);
        return;
      }

      const { error: signUpError } = await signUp(email, password, trimmedUsername);
      if (signUpError) {
        setError(signUpError);
        setSubmitting(false);
        return;
      }
      setInfo('Check your email to confirm your account, then sign in.');
      setMode('signin');
      setSubmitting(false);
      return;
    }

    const { error: signInError } = await signIn(email, password);
    setSubmitting(false);
    if (signInError) {
      setError(signInError);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto bg-[var(--surface)] border border-[var(--border)] rounded-xl p-8">
      <h2 className="text-xl font-semibold tracking-tight text-[var(--text-correct)] mb-1">
        {mode === 'signup' ? 'create account' : 'sign in'}
      </h2>
      <p className="text-[var(--text-muted)] text-sm mb-6">
        {mode === 'signup' ? 'sync your stats across devices' : 'welcome back'}
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {mode === 'signup' && (
          <input
            type="text"
            required
            minLength={3}
            maxLength={20}
            placeholder="username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg px-4 py-2.5 text-sm text-[var(--text-correct)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
          />
        )}
        <input
          type="email"
          required
          placeholder="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg px-4 py-2.5 text-sm text-[var(--text-correct)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
        />
        <input
          type="password"
          required
          minLength={6}
          placeholder="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg px-4 py-2.5 text-sm text-[var(--text-correct)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
        />

        {error && <p className="text-[var(--text-incorrect)] text-xs">{error}</p>}
        {info && <p className="text-[var(--accent)] text-xs">{info}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 w-full bg-[var(--accent)] hover:brightness-110 disabled:opacity-50 text-[var(--bg)] px-6 py-2.5 rounded-lg font-semibold transition-all cursor-pointer"
        >
          {submitting ? '...' : mode === 'signup' ? 'sign up' : 'sign in'}
        </button>
      </form>

      <button
        type="button"
        onClick={() => {
          setMode(m => (m === 'signup' ? 'signin' : 'signup'));
          setError(null);
          setInfo(null);
        }}
        className="mt-4 w-full text-center text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] cursor-pointer"
      >
        {mode === 'signup' ? 'already have an account? sign in' : 'need an account? sign up'}
      </button>
    </div>
  );
}
