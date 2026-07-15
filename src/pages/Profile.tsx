import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ProfileStats from '../components/ProfileStats.js';
import AuthForm from '../components/AuthForm.js';
import Avatar from '../components/Avatar.js';
import CosmeticsPicker from '../components/CosmeticsPicker.js';
import UsernameText from '../components/UsernameText.js';
import UsernameBadge from '../components/UsernameBadge.js';
import BadgePicker from '../components/BadgePicker.js';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../hooks/useAuth.js';
import { useUser } from '../hooks/useUser.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { validateUsername, nextUsernameChangeAt } from '../utils/username.js';

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

function ChangeUsernameModal({ currentUsername, onClose }: { currentUsername: string; onClose: () => void }) {
  const { refreshStats } = useUser();
  const [value, setValue] = useState(currentUsername);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!supabase) return;
    const trimmed = value.trim();
    const validationError = validateUsername(trimmed);
    if (validationError) {
      setError(validationError);
      return;
    }
    if (trimmed.toLowerCase() === currentUsername.toLowerCase()) {
      setError('That is already your username.');
      return;
    }

    setSaving(true);
    setError(null);

    const { data: available, error: checkError } = await supabase.rpc('is_username_available', {
      p_username: trimmed,
    });
    if (checkError) {
      setSaving(false);
      setError('Could not verify username availability. Try again.');
      return;
    }
    if (!available) {
      setSaving(false);
      setError('That username is already taken.');
      return;
    }

    const { error: changeError } = await supabase.rpc('change_username', { p_new_username: trimmed });
    setSaving(false);
    if (changeError) {
      // Rare race: someone else claimed it between the check above and
      // this call, or the 7-day cooldown kicked in between opening this
      // modal and clicking save (e.g. changed it in another tab).
      setError("Couldn't change your name — it may have just been taken, try again.");
      return;
    }
    await refreshStats();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6">
      <div className="w-full max-w-sm bg-[var(--surface)] border border-[var(--border)] rounded-xl p-8">
        <h2 className="text-lg font-semibold text-[var(--text-correct)] mb-1">change your name</h2>
        <p className="text-[var(--text-muted)] text-sm mb-4">You can only change your name once every 7 days.</p>
        <input
          type="text"
          autoFocus
          maxLength={20}
          value={value}
          onChange={e => {
            setValue(e.target.value);
            setError(null);
          }}
          className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg px-4 py-2.5 text-sm text-[var(--text-correct)] focus:outline-none focus:border-[var(--accent)] mb-3"
        />
        {error && <p className="text-[var(--text-incorrect)] text-sm mb-4">{error}</p>}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 text-sm border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)] text-[var(--text-secondary)] px-4 py-2.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || !value.trim()}
            className="flex-1 text-sm bg-[var(--accent)] hover:brightness-110 disabled:opacity-50 text-[var(--bg)] px-4 py-2.5 rounded-lg font-semibold transition-all cursor-pointer"
          >
            {saving ? 'saving…' : 'save'}
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
  const [showChangeUsername, setShowChangeUsername] = useState(false);
  const [showBadgePicker, setShowBadgePicker] = useState(false);
  const nextChangeAt = nextUsernameChangeAt(stats.usernameChangedAt);

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
                <div className="flex items-center gap-2">
                  <p>
                    <UsernameText username={stats.username || 'account'} colorId={stats.equippedNameColor} />
                  </p>
                  <button type="button" onClick={() => setShowBadgePicker(true)} aria-label="Change badge" className="cursor-pointer">
                    {stats.equippedBadge ? (
                      <UsernameBadge badgeId={stats.equippedBadge} circle />
                    ) : (
                      <span className="inline-flex items-center text-[10px] font-medium text-[var(--text-muted)] hover:text-[var(--accent)] hover:border-[var(--accent)] border border-dashed border-[var(--border)] rounded-full px-1.5 py-0.5 transition-colors">
                        + badge
                      </span>
                    )}
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={Boolean(nextChangeAt)}
                  onClick={() => setShowChangeUsername(true)}
                  title={nextChangeAt ? `You can change your name again on ${nextChangeAt.toLocaleDateString()}.` : undefined}
                  className="text-sm border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)] text-[var(--text-secondary)] px-4 py-2 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-[var(--border)] disabled:hover:text-[var(--text-secondary)]"
                >
                  change name
                </button>
                <button
                  onClick={() => signOut()}
                  className="text-sm border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)] text-[var(--text-secondary)] px-4 py-2 rounded-lg transition-colors cursor-pointer"
                >
                  sign out
                </button>
              </div>
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

          {showChangeUsername && (
            <ChangeUsernameModal currentUsername={stats.username} onClose={() => setShowChangeUsername(false)} />
          )}

          {showBadgePicker && <BadgePicker onClose={() => setShowBadgePicker(false)} />}
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
