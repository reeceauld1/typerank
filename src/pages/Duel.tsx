import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../hooks/useAuth.js';
import { generateText } from '../utils/words.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import AuthForm from '../components/AuthForm.js';

type WordCount = 10 | 25 | 50;
const WORD_COUNTS: WordCount[] = [10, 25, 50];

export default function Duel() {
  useDocumentTitle('duel');
  const { user, isConfigured } = useAuth();
  const navigate = useNavigate();
  const [wordCount, setWordCount] = useState<WordCount>(25);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!supabase || !user) return;
    setCreating(true);
    setError(null);

    const { data, error: insertError } = await supabase
      .from('duels')
      .insert({
        creator_id: user.id,
        word_count: wordCount,
        word_list: generateText(wordCount),
      })
      .select('id')
      .single();

    setCreating(false);
    if (insertError || !data) {
      setError("Couldn't create a duel — try again.");
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
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm mx-auto bg-[var(--surface)] border border-[var(--border)] rounded-xl p-8">
        <h1 className="text-xl font-semibold tracking-tight text-[var(--text-correct)] mb-1">start a duel</h1>
        <p className="text-[var(--text-muted)] text-sm mb-6">
          Pick a word count — you'll get a link to send to whoever you want to race.
        </p>

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

        <button
          type="button"
          disabled={creating}
          onClick={() => void handleCreate()}
          className="w-full bg-[var(--accent)] hover:brightness-110 disabled:opacity-50 text-[var(--bg)] px-6 py-2.5 rounded-lg font-semibold transition-all cursor-pointer"
        >
          {creating ? '...' : 'create duel'}
        </button>
      </div>
    </div>
  );
}
