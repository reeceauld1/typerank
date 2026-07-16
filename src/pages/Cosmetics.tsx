import { Link } from 'react-router-dom';
import AuthForm from '../components/AuthForm.js';
import CosmeticsPicker from '../components/CosmeticsPicker.js';
import { useAuth } from '../hooks/useAuth.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';

export default function Cosmetics() {
  useDocumentTitle('cosmetics');
  const { user, isConfigured } = useAuth();

  return (
    <div className="flex-1 flex flex-col py-10 px-6">
      <div className="max-w-4xl w-full mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-8">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--text-correct)]">cosmetics</h1>
        <Link
          to="/profile"
          className="text-sm border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)] text-[var(--text-secondary)] px-4 py-2 rounded-lg transition-colors"
        >
          back to profile
        </Link>
      </div>

      {user ? (
        <CosmeticsPicker />
      ) : isConfigured ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 pb-16">
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
