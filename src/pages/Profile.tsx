import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ProfileStats from '../components/ProfileStats.js';
import AuthForm from '../components/AuthForm.js';
import Avatar from '../components/Avatar.js';
import CosmeticsPicker from '../components/CosmeticsPicker.js';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../hooks/useAuth.js';
import { useUser } from '../hooks/useUser.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';

function DeleteAccountModal({
  deleting,
  error,
  onConfirm,
  onClose,
}: {
  deleting: boolean;
  error: string | null;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6">
      <div className="w-full max-w-sm bg-[var(--surface)] border border-[var(--border)] rounded-xl p-8">
        <h2 className="text-lg font-semibold text-[var(--text-correct)] mb-1">delete your account?</h2>
        <p className="text-[var(--text-muted)] text-sm mb-4">
          This permanently deletes your account and everything tied to it — stats, test history, friends, duels, and
          ranked progress. This can't be undone.
        </p>
        {error && <p className="text-[var(--text-incorrect)] text-sm mb-4">{error}</p>}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="flex-1 text-sm border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)] text-[var(--text-secondary)] px-4 py-2.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 text-sm bg-[var(--text-incorrect)] hover:brightness-110 disabled:opacity-50 text-[var(--bg)] px-4 py-2.5 rounded-lg font-semibold transition-all cursor-pointer"
          >
            {deleting ? 'deleting…' : 'delete account'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Profile() {
  useDocumentTitle('profile');
  const navigate = useNavigate();
  const { user, isConfigured, signOut } = useAuth();
  const { stats } = useUser();
  const [tab, setTab] = useState<'stats' | 'customize'>('stats');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDeleteAccount = async () => {
    if (!supabase) return;
    setDeleting(true);
    setDeleteError(null);
    const { error } = await supabase.rpc('delete_own_account');
    if (error) {
      setDeleting(false);
      setDeleteError("Couldn't delete your account — try again.");
      return;
    }
    await signOut();
    navigate('/');
  };

  return (
    <div className="flex-1 flex flex-col py-10 px-6">
      <div className="max-w-4xl w-full mx-auto flex items-center justify-between mb-8">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--text-correct)]">profile</h1>
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
              <div className="flex items-center gap-4">
                <Avatar avatarId={stats.equippedAvatar} borderId={stats.equippedBorder} size="md" />
                <p className="text-[var(--text-correct)] font-semibold">
                  {(user.user_metadata?.username as string | undefined) ?? 'account'}
                </p>
              </div>
              <button
                onClick={() => signOut()}
                className="text-sm border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)] text-[var(--text-secondary)] px-4 py-2 rounded-lg transition-colors cursor-pointer"
              >
                sign out
              </button>
            </div>
          </div>

          <div className="max-w-4xl w-full mx-auto flex items-center gap-1 bg-[var(--surface)] border border-[var(--border)] rounded-lg p-1 mb-6 text-sm">
            <button
              onClick={() => setTab('stats')}
              className={`flex-1 py-2 rounded-md font-medium transition-colors cursor-pointer ${
                tab === 'stats' ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              stats
            </button>
            <button
              onClick={() => setTab('customize')}
              className={`flex-1 py-2 rounded-md font-medium transition-colors cursor-pointer ${
                tab === 'customize' ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              customize
            </button>
          </div>

          {tab === 'stats' ? <ProfileStats /> : <CosmeticsPicker />}

          <div className="max-w-4xl w-full mx-auto mt-10 pt-6 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="text-sm text-[var(--text-muted)] hover:text-[var(--text-incorrect)] transition-colors cursor-pointer"
            >
              delete account
            </button>
          </div>

          {showDeleteConfirm && (
            <DeleteAccountModal
              deleting={deleting}
              error={deleteError}
              onConfirm={() => void handleDeleteAccount()}
              onClose={() => {
                setShowDeleteConfirm(false);
                setDeleteError(null);
              }}
            />
          )}
        </>
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
