import { Link, Navigate } from 'react-router-dom';
import DailyChallenge from '../components/DailyChallenge.js';
import WeeklyChallenge from '../components/WeeklyChallenge.js';
import CosmeticProgressSection from '../components/CosmeticProgressSection.js';
import { useAuth } from '../hooks/useAuth.js';
import { useUser } from '../hooks/useUser.js';
import { AVATAR_CATALOG, BORDER_CATALOG, isAdminEmail } from '../utils/cosmetics.js';
import { ACCENT_COLOR_CATALOG } from '../utils/accentColors.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';

const PREVIEW_SIZE = 'w-10 h-10';

export default function Challenges() {
  useDocumentTitle('challenges');
  const { user, loading } = useAuth();
  const { stats } = useUser();
  const admin = isAdminEmail(user?.email);

  if (!loading && !user) {
    return <Navigate to="/profile" replace />;
  }

  return (
    <div className="flex-1 py-10 px-6">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-8">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--text-correct)]">challenges</h1>
        <Link
          to="/"
          className="text-sm border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)] text-[var(--text-secondary)] px-4 py-2 rounded-lg transition-colors"
        >
          back to test
        </Link>
      </div>

      <div className="max-w-4xl mx-auto flex flex-col gap-4">
        <DailyChallenge />
        <WeeklyChallenge />
        <CosmeticProgressSection
          title="avatars"
          items={AVATAR_CATALOG}
          stats={stats}
          admin={admin}
          renderPreview={avatar => {
            const Icon = avatar.icon;
            return (
              <div className={`${PREVIEW_SIZE} rounded-full flex items-center justify-center shrink-0 bg-[var(--bg-elevated)] text-[var(--text-correct)]`}>
                <Icon className="w-5 h-5" />
              </div>
            );
          }}
        />
        <CosmeticProgressSection
          title="borders"
          items={BORDER_CATALOG}
          stats={stats}
          admin={admin}
          renderPreview={border => (
            <div className={`relative shrink-0 rounded-full ${border.id === 'legend' ? 'legend-glow-wrapper' : ''}`}>
              <div className={`${PREVIEW_SIZE} border-2 rounded-full bg-[var(--bg-elevated)] ${border.className}`} />
            </div>
          )}
        />
        <CosmeticProgressSection
          title="accent colors"
          items={ACCENT_COLOR_CATALOG}
          stats={stats}
          admin={admin}
          renderPreview={color => (
            <div
              className={`${PREVIEW_SIZE} rounded-full border-2 border-[var(--border)] shrink-0`}
              style={
                color.id === 'monochrome'
                  ? { background: 'linear-gradient(135deg, #000 50%, #fff 50%)' }
                  : { backgroundColor: color.hex }
              }
            />
          )}
        />
      </div>
    </div>
  );
}
