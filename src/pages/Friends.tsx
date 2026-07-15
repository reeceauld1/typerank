import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { useFriends } from '../hooks/useFriends.js';
import { supabase } from '../lib/supabase.js';
import Avatar from '../components/Avatar.js';
import AuthForm from '../components/AuthForm.js';
import UsernameText from '../components/UsernameText.js';
import type { FriendEntry } from '../types/index.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';

type Tab = 'requests' | 'friends' | 'find';

function FriendRow({
  entry,
  children,
}: {
  entry: FriendEntry;
  children?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg p-3">
      <Link to={`/u/${entry.username}`} className="flex items-center gap-3 min-w-0 group">
        <Avatar avatarId={entry.equippedAvatar} borderId={entry.equippedBorder} size="sm" />
        <UsernameText username={entry.username} colorId={entry.equippedNameColor} className="truncate" />
      </Link>
      <div className="flex items-center gap-2 shrink-0">{children}</div>
    </div>
  );
}

function ActionButton({
  onClick,
  variant = 'default',
  children,
}: {
  onClick: () => void;
  variant?: 'default' | 'accent';
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-xs font-medium px-3 py-1.5 rounded-md border transition-colors cursor-pointer ${
        variant === 'accent'
          ? 'border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent-soft)]'
          : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)]'
      }`}
    >
      {children}
    </button>
  );
}

function FindPeople() {
  const { user } = useAuth();
  const { friends, incomingRequests, outgoingRequests, sendRequest } = useFriends();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FriendEntry[]>([]);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const relationshipStatus = (userId: string): 'friend' | 'incoming' | 'outgoing' | null => {
    if (friends.some(f => f.userId === userId)) return 'friend';
    if (incomingRequests.some(f => f.userId === userId)) return 'incoming';
    if (outgoingRequests.some(f => f.userId === userId)) return 'outgoing';
    return null;
  };

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    if (!supabase || !user || query.trim().length < 2) return;
    setSearching(true);
    setMessage(null);
    const { data, error } = await supabase
      .from('user_stats')
      .select('user_id, username, equipped_avatar, equipped_border, equipped_name_color')
      .ilike('username', `%${query.trim()}%`)
      .neq('user_id', user.id)
      .limit(15);
    if (error) {
      setMessage(`Search failed: ${error.message}`);
      setResults([]);
    } else {
      setResults(
        (data ?? []).map(row => ({
          userId: row.user_id as string,
          username: row.username as string,
          equippedAvatar: row.equipped_avatar as string,
          equippedBorder: row.equipped_border as string,
          equippedNameColor: (row.equipped_name_color as string) ?? 'default',
        }))
      );
      if ((data ?? []).length === 0) setMessage('No users found.');
    }
    setSearching(false);
  };

  const handleAdd = async (username: string) => {
    setMessage(null);
    const result = await sendRequest(username);
    setMessage(result.ok ? `Friend request sent to ${username}.` : (result.error ?? 'Something went wrong.'));
  };

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={e => void handleSearch(e)} className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="search by username"
          className="flex-1 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-correct)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
        />
        <button
          type="submit"
          disabled={searching || query.trim().length < 2}
          className="text-sm font-medium px-4 py-2 rounded-lg border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent-soft)] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          search
        </button>
      </form>

      {message && <p className="text-sm text-[var(--text-muted)]">{message}</p>}

      <div className="flex flex-col gap-2">
        {results.map(result => {
          const status = relationshipStatus(result.userId);
          return (
            <FriendRow key={result.userId} entry={result}>
              {status === 'friend' && <span className="text-xs text-[var(--text-muted)]">friends</span>}
              {status === 'outgoing' && <span className="text-xs text-[var(--text-muted)]">requested</span>}
              {status === 'incoming' && <span className="text-xs text-[var(--text-muted)]">check requests</span>}
              {status === null && (
                <ActionButton variant="accent" onClick={() => void handleAdd(result.username)}>
                  add
                </ActionButton>
              )}
            </FriendRow>
          );
        })}
      </div>
    </div>
  );
}

export default function Friends() {
  useDocumentTitle('friends');
  const { user, isConfigured } = useAuth();
  const { friends, incomingRequests, outgoingRequests, acceptRequest, declineRequest, removeFriend } = useFriends();
  const [tab, setTab] = useState<Tab>('friends');

  if (!isConfigured) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 pb-16">
        <p className="text-[var(--text-correct)] font-semibold">Accounts aren't set up yet</p>
        <p className="text-[var(--text-muted)] text-sm max-w-md">
          This deployment hasn't been connected to Supabase, so friends aren't available.
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
    <div className="flex-1 flex flex-col py-10 px-6">
      <div className="max-w-4xl w-full mx-auto flex items-center justify-between mb-8">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--text-correct)]">friends</h1>
        <Link
          to="/profile"
          className="text-sm border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)] text-[var(--text-secondary)] px-4 py-2 rounded-lg transition-colors"
        >
          back to profile
        </Link>
      </div>

      <div className="max-w-4xl w-full mx-auto flex items-center gap-1 bg-[var(--surface)] border border-[var(--border)] rounded-lg p-1 mb-6 text-sm">
        {(
          [
            ['friends', `friends (${friends.length})`],
            ['requests', `requests${incomingRequests.length > 0 ? ` (${incomingRequests.length})` : ''}`],
            ['find', 'find people'],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 py-2 rounded-md font-medium transition-colors cursor-pointer ${
              tab === key ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="max-w-4xl w-full mx-auto flex flex-col gap-6">
        {tab === 'requests' && (
          <>
            <section>
              <h3 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-3">incoming</h3>
              {incomingRequests.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">No incoming requests.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {incomingRequests.map(entry => (
                    <FriendRow key={entry.userId} entry={entry}>
                      <ActionButton variant="accent" onClick={() => void acceptRequest(entry.userId)}>
                        accept
                      </ActionButton>
                      <ActionButton onClick={() => void declineRequest(entry.userId)}>decline</ActionButton>
                    </FriendRow>
                  ))}
                </div>
              )}
            </section>
            <section>
              <h3 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-3">sent</h3>
              {outgoingRequests.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">No outgoing requests.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {outgoingRequests.map(entry => (
                    <FriendRow key={entry.userId} entry={entry}>
                      <ActionButton onClick={() => void removeFriend(entry.userId)}>cancel</ActionButton>
                    </FriendRow>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {tab === 'friends' &&
          (friends.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">No friends yet — find people to add.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {friends.map(entry => (
                <FriendRow key={entry.userId} entry={entry}>
                  <ActionButton onClick={() => void removeFriend(entry.userId)}>remove</ActionButton>
                </FriendRow>
              ))}
            </div>
          ))}

        {tab === 'find' && <FindPeople />}
      </div>
    </div>
  );
}
