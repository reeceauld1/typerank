import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../hooks/useAuth.js';
import { useFriends } from '../hooks/useFriends.js';
import { generateText } from '../utils/words.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import Avatar from '../components/Avatar.js';

type WordCount = 10 | 25 | 50;
const WORD_COUNTS: WordCount[] = [10, 25, 50];

interface PendingInvite {
  id: string;
  wordCount: number;
}

function WordCountPicker({ value, onChange }: { value: WordCount; onChange: (count: WordCount) => void }) {
  return (
    <div className="flex items-center gap-1 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg p-1 text-sm w-fit mb-6">
      {WORD_COUNTS.map(count => (
        <button
          key={count}
          type="button"
          onClick={() => onChange(count)}
          className={`px-4 py-2 rounded-md font-medium transition-colors cursor-pointer ${
            value === count ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
          }`}
        >
          {count} words
        </button>
      ))}
    </div>
  );
}

function LinkPopup({
  link,
  copied,
  onCopy,
  onClose,
}: {
  link: string;
  copied: boolean;
  onCopy: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6">
      <div className="w-full max-w-sm bg-[var(--surface)] border border-[var(--border)] rounded-xl p-8">
        <h2 className="text-lg font-semibold text-[var(--text-correct)] mb-1">duel link ready</h2>
        <p className="text-[var(--text-muted)] text-sm mb-4">Send this to whoever you want to race.</p>
        <div className="flex items-center gap-2 mb-4">
          <input
            readOnly
            value={link}
            className="flex-1 min-w-0 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--text-correct)] truncate"
          />
          <button
            type="button"
            onClick={onCopy}
            className="shrink-0 text-sm border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent-soft)] px-3 py-2 rounded-lg transition-colors cursor-pointer"
          >
            {copied ? 'copied' : 'copy'}
          </button>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-full bg-[var(--accent)] hover:brightness-110 text-[var(--bg)] px-6 py-2.5 rounded-lg font-semibold transition-all cursor-pointer"
        >
          close
        </button>
      </div>
    </div>
  );
}

export default function Duel() {
  useDocumentTitle('duel');
  const { user, isConfigured } = useAuth();
  const { friends } = useFriends();
  const navigate = useNavigate();
  const [wordCount, setWordCount] = useState<WordCount>(25);
  const [creating, setCreating] = useState(false);
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [invitesLoading, setInvitesLoading] = useState(true);

  // Shared by both the account and guest "create a link" flows — a popup
  // with the link, a copy button, and a close button that takes you into
  // the duel.
  const [pendingDuelId, setPendingDuelId] = useState<string | null>(null);
  const [pendingDuelLink, setPendingDuelLink] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  // Guest (no account) creation flow: pick word count -> enter name -> the
  // link popup above.
  const [guestStep, setGuestStep] = useState<'pick-count' | 'enter-name'>('pick-count');
  const [guestName, setGuestName] = useState('');
  const [guestCreating, setGuestCreating] = useState(false);
  const [guestError, setGuestError] = useState<string | null>(null);

  const loadInvites = useCallback(async () => {
    if (!supabase || !user) return;
    const { data } = await supabase
      .from('duels')
      .select('id, word_count')
      .eq('opponent_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    setInvites((data ?? []).map(row => ({ id: row.id as string, wordCount: row.word_count as number })));
  }, [user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInvitesLoading(true);
    loadInvites().finally(() => setInvitesLoading(false));
  }, [loadInvites]);

  useEffect(() => {
    const client = supabase;
    if (!client || !user) return;
    const channel = client
      .channel(`duel-invites-page-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'duels', filter: `opponent_id=eq.${user.id}` }, () => {
        void loadInvites();
      })
      .subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [user, loadInvites]);

  const handleCreateLink = async () => {
    if (!supabase || !user) return;
    setCreating(true);
    setError(null);
    const { data, error: insertError } = await supabase
      .from('duels')
      .insert({ creator_id: user.id, word_count: wordCount, word_list: generateText(wordCount) })
      .select('id')
      .single();
    setCreating(false);
    if (insertError || !data) {
      setError("Couldn't create a duel — try again.");
      return;
    }
    const duelId = data.id as string;
    setPendingDuelId(duelId);
    setPendingDuelLink(`${window.location.origin}/duel/${duelId}`);
  };

  const handleInviteFriend = async (friendId: string) => {
    if (!supabase || !user) return;
    setInvitingId(friendId);
    setError(null);
    const { data, error: insertError } = await supabase
      .from('duels')
      .insert({
        creator_id: user.id,
        opponent_id: friendId,
        status: 'pending',
        word_count: wordCount,
        word_list: generateText(wordCount),
      })
      .select('id')
      .single();
    setInvitingId(null);
    if (insertError || !data) {
      setError("Couldn't send that invite — try again.");
      return;
    }
    navigate(`/duel/${data.id as string}`);
  };

  const handleGuestCreate = async () => {
    if (!supabase || !guestName.trim()) return;
    setGuestCreating(true);
    setGuestError(null);
    const { data, error: rpcError } = await supabase
      .rpc('create_guest_duel', {
        p_word_count: wordCount,
        p_word_list: generateText(wordCount),
        p_creator_name: guestName.trim(),
      })
      .single();
    setGuestCreating(false);
    if (rpcError || !data) {
      setGuestError("Couldn't create a duel — try again.");
      return;
    }
    const row = data as { id: string; creator_token: string };
    try {
      sessionStorage.setItem(`duel_token_${row.id}`, row.creator_token);
    } catch {
      // ignore unavailable storage
    }
    setPendingDuelId(row.id);
    setPendingDuelLink(`${window.location.origin}/duel/${row.id}`);
  };

  const copyPendingLink = () => {
    if (!pendingDuelLink) return;
    void navigator.clipboard.writeText(pendingDuelLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const closeLinkPopup = () => {
    if (pendingDuelId) navigate(`/duel/${pendingDuelId}`);
  };

  if (!isConfigured) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 pb-16">
        <p className="text-[var(--text-correct)] font-semibold">Accounts aren't set up yet</p>
        <p className="text-[var(--text-muted)] text-sm max-w-md">
          This deployment hasn't been connected to Supabase, so duels aren't available.
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10">
        <div className="w-full max-w-sm mx-auto bg-[var(--surface)] border border-[var(--border)] rounded-xl p-8">
          <h1 className="text-xl font-semibold tracking-tight text-[var(--text-correct)] mb-1">start a duel</h1>
          <p className="text-[var(--text-muted)] text-sm mb-6">
            {guestStep === 'pick-count' ? 'Pick a word count.' : "What's your name?"}
          </p>

          {guestStep === 'pick-count' ? (
            <>
              <WordCountPicker value={wordCount} onChange={setWordCount} />
              <button
                type="button"
                onClick={() => setGuestStep('enter-name')}
                className="w-full bg-[var(--accent)] hover:brightness-110 text-[var(--bg)] px-6 py-2.5 rounded-lg font-semibold transition-all cursor-pointer"
              >
                next
              </button>
            </>
          ) : (
            <>
              <input
                type="text"
                autoFocus
                maxLength={20}
                placeholder="your name"
                value={guestName}
                onChange={e => setGuestName(e.target.value)}
                className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg px-4 py-2.5 text-sm text-[var(--text-correct)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] mb-3"
              />
              {guestError && <p className="text-[var(--text-incorrect)] text-xs mb-3">{guestError}</p>}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setGuestStep('pick-count')}
                  className="text-sm border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)] text-[var(--text-secondary)] px-4 py-2 rounded-lg transition-colors cursor-pointer"
                >
                  back
                </button>
                <button
                  type="button"
                  disabled={guestCreating || !guestName.trim()}
                  onClick={() => void handleGuestCreate()}
                  className="flex-1 bg-[var(--accent)] hover:brightness-110 disabled:opacity-50 text-[var(--bg)] px-6 py-2.5 rounded-lg font-semibold transition-all cursor-pointer"
                >
                  {guestCreating ? '...' : 'create duel'}
                </button>
              </div>
            </>
          )}

          <p className="text-center text-xs text-[var(--text-muted)] mt-6">
            have an account?{' '}
            <Link to="/profile" className="text-[var(--accent)] hover:underline">
              sign in
            </Link>{' '}
            to challenge friends directly.
          </p>
        </div>

        {pendingDuelLink && (
          <LinkPopup link={pendingDuelLink} copied={linkCopied} onCopy={copyPendingLink} onClose={closeLinkPopup} />
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center py-10 px-6 gap-4">
      {!invitesLoading && invites.length > 0 && (
        <div className="w-full max-w-sm mx-auto bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6">
          <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-3">duel invites</h2>
          <div className="flex flex-col gap-2">
            {invites.map(invite => (
              <Link
                key={invite.id}
                to={`/duel/${invite.id}`}
                className="flex items-center justify-between bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm hover:border-[var(--accent)] transition-colors"
              >
                <span className="text-[var(--text-secondary)]">{invite.wordCount}-word duel</span>
                <span className="text-[var(--accent)] text-xs font-semibold">respond</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="w-full max-w-sm mx-auto bg-[var(--surface)] border border-[var(--border)] rounded-xl p-8">
        <h1 className="text-xl font-semibold tracking-tight text-[var(--text-correct)] mb-1">start a duel</h1>
        <p className="text-[var(--text-muted)] text-sm mb-6">Pick a word count, then challenge a friend or share a link.</p>

        <WordCountPicker value={wordCount} onChange={setWordCount} />

        {error && <p className="text-[var(--text-incorrect)] text-xs mb-3">{error}</p>}

        {friends.length > 0 && (
          <div className="flex flex-col gap-2 mb-4 max-h-64 overflow-y-auto">
            {friends.map(friend => (
              <div
                key={friend.userId}
                className="flex items-center justify-between bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg px-3 py-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Avatar avatarId={friend.equippedAvatar} borderId={friend.equippedBorder} size="sm" />
                  <span className="text-sm text-[var(--text-correct)] truncate">{friend.username}</span>
                </div>
                <button
                  type="button"
                  disabled={invitingId === friend.userId}
                  onClick={() => void handleInviteFriend(friend.userId)}
                  className="text-xs font-medium px-3 py-1.5 rounded-md border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent-soft)] transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                >
                  {invitingId === friend.userId ? '...' : 'duel'}
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          disabled={creating}
          onClick={() => void handleCreateLink()}
          className="w-full text-sm border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)] text-[var(--text-secondary)] px-6 py-2.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
        >
          {creating ? '...' : 'or create a shareable link'}
        </button>
      </div>

      {pendingDuelLink && (
        <LinkPopup link={pendingDuelLink} copied={linkCopied} onCopy={copyPendingLink} onClose={closeLinkPopup} />
      )}
    </div>
  );
}
