import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../hooks/useAuth.js';
import { useUser } from '../hooks/useUser.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { getRankTier, PLACEMENT_GAMES, RANK_TIERS, TIER_COLORS } from '../utils/rank.js';
import RankBadge from '../components/RankBadge.js';
import TierLabel from '../components/TierLabel.js';
import AuthForm from '../components/AuthForm.js';
import NameColorPicker from '../components/NameColorPicker.js';

// How often the waiting client re-attempts try_match_ranked while queued —
// this is also what makes a lone waiting player eventually get matched once
// someone else joins, without any cron job or Edge Function: everyone's own
// poll doubles as the matcher.
const POLL_INTERVAL_MS = 3000;

interface MatchResult {
  match_id: string | null;
  status: 'matched' | 'queued';
}

export default function Ranked() {
  useDocumentTitle('ranked', 'Compete in ranked typing races against real players on typeladder. Climb the elo ladder from Bronze to Legend in this competitive typing game.');
  const navigate = useNavigate();
  const { user, isConfigured } = useAuth();
  const { stats } = useUser();

  const [searching, setSearching] = useState(false);
  const [searchStart, setSearchStart] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showRewards, setShowRewards] = useState(false);

  // Read inside the unmount cleanup below, since that closure only ever
  // sees the values from the render it was created in otherwise.
  const searchingRef = useRef(searching);
  useEffect(() => {
    searchingRef.current = searching;
  }, [searching]);

  useEffect(() => {
    return () => {
      if (searchingRef.current && supabase) {
        void supabase.rpc('leave_ranked_queue');
      }
    };
  }, []);

  const attemptMatch = async () => {
    if (!supabase) return;
    const { data, error: rpcError } = await supabase.rpc('try_match_ranked', { p_elo: stats.elo }).single();
    if (rpcError || !data) {
      setError("Couldn't reach matchmaking - try again.");
      setSearching(false);
      return;
    }
    const result = data as MatchResult;
    if (result.status === 'matched' && result.match_id) {
      navigate(`/ranked/${result.match_id}`);
      return;
    }
    setSearching(true);
  };

  const handleFindMatch = () => {
    setError(null);
    setSearchStart(Date.now());
    void attemptMatch();
  };

  const handleCancel = async () => {
    if (supabase) await supabase.rpc('leave_ranked_queue');
    setSearching(false);
    setSearchStart(null);
    setElapsed(0);
  };

  useEffect(() => {
    if (!searching) return;
    const poll = setInterval(() => void attemptMatch(), POLL_INTERVAL_MS);
    return () => clearInterval(poll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searching]);

  useEffect(() => {
    if (!searching || searchStart === null) return;
    const tick = setInterval(() => setElapsed(Math.floor((Date.now() - searchStart) / 1000)), 1000);
    return () => clearInterval(tick);
  }, [searching, searchStart]);

  if (!isConfigured) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 pb-16">
        <p className="text-[var(--text-correct)] font-semibold">Accounts aren't set up yet</p>
        <p className="text-[var(--text-muted)] text-sm max-w-md">
          This deployment hasn't been connected to Supabase, so ranked matches aren't available.
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 pb-16 px-6 text-center">
        <p className="text-[var(--text-correct)] font-semibold">Sign in to play ranked.</p>
        <p className="text-[var(--text-muted)] text-sm max-w-sm">
          Ranked elo needs an account to persist - unlike duels, there's no guest option here.
        </p>
        <AuthForm />
      </div>
    );
  }

  const tier = getRankTier(stats.elo, stats.rankedGamesPlayed);

  return (
    // relative so the sidebar (absolute on lg+, see below) anchors to this
    // page rather than the nearest positioned ancestor further up the
    // tree. Once it's absolute it's out of flow entirely, so it no longer
    // affects how this flex container centers everything else — the main
    // column stays centered on the full page, not on the combined width of
    // itself plus the sidebar.
    <div className="flex-1 relative flex flex-col items-center justify-center gap-6 py-10 px-6 text-center">
      <div className="flex flex-col items-center gap-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[var(--text-correct)] mb-2">ranked</h1>
          <RankBadge elo={stats.elo} rankedGamesPlayed={stats.rankedGamesPlayed} className="justify-center" />
          {!tier && (
            <p className="text-[var(--text-muted)] text-xs mt-2">
              {PLACEMENT_GAMES - stats.rankedGamesPlayed} placement {PLACEMENT_GAMES - stats.rankedGamesPlayed === 1 ? 'match' : 'matches'} left
            </p>
          )}
        </div>

        {error && <p className="text-[var(--text-incorrect)] text-sm">{error}</p>}

        {searching ? (
          <div className="flex flex-col items-center gap-4">
            <p className="text-[var(--text-secondary)] text-sm">
              searching for an opponent… <span className="tabular-nums">{elapsed}s</span>
            </p>
            <button
              type="button"
              onClick={() => void handleCancel()}
              className="text-sm border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)] text-[var(--text-secondary)] px-4 py-2 rounded-lg transition-colors cursor-pointer"
            >
              cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleFindMatch}
            className="bg-[var(--accent)] hover:brightness-110 text-[var(--bg)] px-6 py-2.5 rounded-lg font-semibold transition-all cursor-pointer"
          >
            find match
          </button>
        )}

        <p className="text-[var(--text-muted)] text-xs max-w-sm">
          30-second time test, one fixed format for everyone. Win to gain elo, lose to drop - closer opponents move
          your rating more than lopsided matches.
        </p>

        <button
          type="button"
          onClick={() => setShowRewards(true)}
          className="text-sm border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)] text-[var(--text-secondary)] px-4 py-2 rounded-lg transition-colors cursor-pointer"
        >
          rewards
        </button>

        {showRewards && <NameColorPicker onClose={() => setShowRewards(false)} readOnly />}
      </div>

      <div className="w-full max-w-xs bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 text-left lg:absolute lg:right-6 lg:top-1/2 lg:-translate-y-1/2">
        <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-3">rank thresholds</h2>
        <div className="flex flex-col gap-2">
          {[...RANK_TIERS].reverse().map((t, i, arr) => {
            const nextMin = i > 0 ? arr[i - 1].min : null;
            const isMine = tier?.id === t.id;
            return (
              <div
                key={t.id}
                className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                  isMine ? 'bg-[var(--accent-soft)]' : ''
                }`}
              >
                <span className="flex items-center gap-2">
                  <TierLabel tierId={t.id} tierName={t.name} color={TIER_COLORS[t.id]} className="text-sm" />
                </span>
                <span className="text-xs text-[var(--text-muted)] tabular-nums whitespace-nowrap">
                  {t.min.toLocaleString()}
                  {nextMin !== null ? `–${(nextMin - 1).toLocaleString()}` : '+'} elo
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
