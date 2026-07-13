import { Link, Navigate } from 'react-router-dom';
import DailyChallenge from '../components/DailyChallenge.js';
import WeeklyChallenge from '../components/WeeklyChallenge.js';
import { useAuth } from '../hooks/useAuth.js';

export default function Challenges() {
  const { user, loading } = useAuth();

  if (!loading && !user) {
    return <Navigate to="/profile" replace />;
  }

  return (
    <div className="flex-1 py-10 px-6">
      <div className="max-w-2xl mx-auto flex items-center justify-between mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--text-correct)]">challenges</h1>
        <Link
          to="/"
          className="text-sm border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)] text-[var(--text-secondary)] px-4 py-2 rounded-lg transition-colors"
        >
          back to test
        </Link>
      </div>

      <div className="max-w-2xl mx-auto flex flex-col gap-4">
        <DailyChallenge />
        <WeeklyChallenge />
      </div>
    </div>
  );
}
