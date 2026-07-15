import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../hooks/useAuth.js';
import { useFriends } from '../hooks/useFriends.js';
import { generateText } from '../utils/words.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import AuthForm from '../components/AuthForm.js';
import Avatar from '../components/Avatar.js';

type WordCount = 10 | 25 | 50;
const WORD_COUNTS: WordCount[] = [10, 25, 50];

interface PendingInvite {
  id: string;
  wordCount: number;
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
    navigate(`/duel/${data.id as string}`);
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
      <div className="flex-1 flex flex-col items-center justify-center gap-4 pb-16">
        <AuthForm />
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

        <div className="flex items-center gap-1 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg p-1 text-sm w-fit mb-6">
          {WORD_COUNTS.map(count => (
            <button
              key={count}
              type="button"
              onClick={() => setWordCount(count)}
              className={`px-4 py-2 rounded-md font-medium transition-colors cursor-pointer ${
                wordCount === count
                  ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              {count} words
            </button>
          ))}
        </div>

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
    </div>
  );
}
