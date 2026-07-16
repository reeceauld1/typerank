import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../hooks/useAuth.js';
import { useSettings } from '../hooks/useSettings.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import TypingTest from '../components/TypingTest.js';
import KeyboardDisplay from '../components/KeyboardDisplay.js';
import Toggle from '../components/Toggle.js';
import { KEYBOARD_LAYOUTS, getLayoutRowCodes, getLayoutRows } from '../utils/keyboardLayouts.js';
import {
  anchorLetters,
  generatePracticeText,
  getNextLetterToUnlock,
  isReadyToUnlock,
  mergeLetterAccuracy,
  totalRepsInRound,
  ROUND_WORD_COUNT,
  type LetterAccuracy,
  type LetterTally,
} from '../utils/learnMode.js';

const LOCAL_STORAGE_PREFIX = 'learnProgress_';

interface StoredProgress {
  unlockedLetters: string;
  letterAccuracy: LetterAccuracy;
  totalRepsSinceUnlock: number;
}

// Guests (and signed-in visits when Supabase isn't configured at all) keep
// progress purely in the browser, per keyboard layout — same guest-friendly,
// no-account-needed pattern as the theme/font/keyboard-layout prefs
// themselves. Signed-in users get the account-synced version instead (see
// the load/save effects below), so progress follows them across devices.
function loadLocalProgress(layout: string): StoredProgress | null {
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}${layout}`);
    return raw ? (JSON.parse(raw) as StoredProgress) : null;
  } catch {
    return null;
  }
}

function saveLocalProgress(layout: string, progress: StoredProgress) {
  try {
    localStorage.setItem(`${LOCAL_STORAGE_PREFIX}${layout}`, JSON.stringify(progress));
  } catch {
    // ignore unavailable storage
  }
}

export default function Learn() {
  useDocumentTitle('learn', 'Learn to type from scratch on typeladder with a keybr-style lesson mode — start on the home row and unlock new letters as your accuracy improves.');
  const { user, loading: authLoading } = useAuth();
  // Supabase hands back a brand new `user` object on every token refresh
  // (a routine background event, not just sign-in/out) — depending the load
  // effect below on `user` itself made it refire on those refreshes too,
  // re-fetching from Supabase and reverting any not-yet-persisted unlock if
  // that refetch raced the previous round's fire-and-forget save. `user.id`
  // is stable across refreshes, so it only refires on an actual account
  // change.
  const userId = user?.id ?? null;
  const { keyboardLayout } = useSettings();
  // Independent from the main typing page's on-screen-keyboard settings —
  // this page's keyboard is either fully on (colors + finger labels, since
  // that's the whole point here) or fully off, a local toggle rather than
  // anything in Settings.
  const [showKeyboardDisplay, setShowKeyboardDisplay] = useState(true);

  const [loading, setLoading] = useState(true);
  const [unlockedLetters, setUnlockedLetters] = useState<string[]>([]);
  const [letterAccuracy, setLetterAccuracy] = useState<LetterAccuracy>({});
  const [totalRepsSinceUnlock, setTotalRepsSinceUnlock] = useState(0);
  const [practiceText, setPracticeText] = useState('');
  const [roundKey, setRoundKey] = useState(0);
  const [justUnlocked, setJustUnlocked] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const roundTalliesRef = useRef<LetterTally>({});

  useEffect(() => {
    let cancelled = false;

    const applyFresh = () => {
      const fresh = anchorLetters(keyboardLayout);
      setUnlockedLetters(fresh);
      setLetterAccuracy({});
      setTotalRepsSinceUnlock(0);
      setPracticeText(generatePracticeText(fresh));
    };

    const applyStored = (unlocked: string, letterAcc: LetterAccuracy, reps: number) => {
      const letters = unlocked.split('');
      setUnlockedLetters(letters);
      setLetterAccuracy(letterAcc ?? {});
      setTotalRepsSinceUnlock(reps ?? 0);
      setPracticeText(generatePracticeText(letters));
    };

    const load = async () => {
      // Still resolving whether there's a session at all — auth.getSession()
      // is async, so on every fresh page load userId briefly reads as null
      // before it does. Deciding "guest" here was the bug behind progress
      // silently not reaching the account: a round finished (and saved
      // locally) in that window before userId flipped to signed-in never
      // gets picked up by the account row, which then looks stuck to a
      // user who's actually signed in the whole time. Same hazard
      // UserContext's refresh effect guards against for stats/cosmetics.
      if (authLoading) return;

      setLoading(true);

      if (userId && supabase) {
        const { data } = await supabase.from('learn_progress').select('*').eq('user_id', userId).maybeSingle();
        if (cancelled) return;
        // Progress is per-layout — if the saved row is for a different
        // layout than the one currently selected in Settings, start fresh
        // for this layout rather than trying to remap letters across it.
        if (data && data.keyboard_layout === keyboardLayout) {
          applyStored(data.unlocked_letters as string, data.letter_accuracy as LetterAccuracy, data.total_reps_since_unlock as number);
        } else {
          applyFresh();
        }
      } else {
        const stored = loadLocalProgress(keyboardLayout);
        if (stored) applyStored(stored.unlockedLetters, stored.letterAccuracy, stored.totalRepsSinceUnlock);
        else applyFresh();
      }

      setJustUnlocked(null);
      setLoading(false);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [userId, keyboardLayout, authLoading]);

  const saveProgress = (nextUnlocked: string[], nextAccuracy: LetterAccuracy, nextReps: number) => {
    if (userId && supabase) {
      void supabase.rpc('save_learn_progress', {
        p_keyboard_layout: keyboardLayout,
        p_unlocked_letters: nextUnlocked.join(''),
        p_letter_accuracy: nextAccuracy,
        p_total_reps_since_unlock: nextReps,
      });
    } else {
      saveLocalProgress(keyboardLayout, {
        unlockedLetters: nextUnlocked.join(''),
        letterAccuracy: nextAccuracy,
        totalRepsSinceUnlock: nextReps,
      });
    }
  };

  const handleCharacterResult = (expected: string, _typed: string, correct: boolean) => {
    if (expected === ' ') return;
    const tally = roundTalliesRef.current[expected] ?? { correct: 0, total: 0 };
    tally.total += 1;
    if (correct) tally.correct += 1;
    roundTalliesRef.current[expected] = tally;
  };

  const handleRoundComplete = () => {
    const tallies = roundTalliesRef.current;
    roundTalliesRef.current = {};

    const nextAccuracy = mergeLetterAccuracy(letterAccuracy, tallies);
    let nextReps = totalRepsSinceUnlock + totalRepsInRound(tallies);
    let nextUnlocked = unlockedLetters;
    let unlockedThisRound: string | null = null;

    if (isReadyToUnlock(unlockedLetters, nextAccuracy, nextReps)) {
      const next = getNextLetterToUnlock(keyboardLayout, unlockedLetters);
      if (next) {
        nextUnlocked = [...unlockedLetters, next];
        nextReps = 0;
        unlockedThisRound = next;
      }
    }

    setLetterAccuracy(nextAccuracy);
    setTotalRepsSinceUnlock(nextReps);
    setUnlockedLetters(nextUnlocked);
    setJustUnlocked(unlockedThisRound);
    saveProgress(nextUnlocked, nextAccuracy, nextReps);
    setPracticeText(generatePracticeText(nextUnlocked));
    setRoundKey(k => k + 1);
  };

  // Tab/Escape restarts mid-round (TypingTest's own built-in shortcut) —
  // discards the abandoned round's partial tallies rather than counting
  // them, and hands back a fresh round on the same currently-unlocked
  // letters so spamming Tab just keeps cycling practice text.
  const handleRestart = () => {
    roundTalliesRef.current = {};
    setPracticeText(generatePracticeText(unlockedLetters));
    setRoundKey(k => k + 1);
  };

  const handleReset = () => {
    const fresh = anchorLetters(keyboardLayout);
    setUnlockedLetters(fresh);
    setLetterAccuracy({});
    setTotalRepsSinceUnlock(0);
    setJustUnlocked(null);
    saveProgress(fresh, {}, 0);
    setPracticeText(generatePracticeText(fresh));
    setRoundKey(k => k + 1);
    setShowResetConfirm(false);
  };

  if (loading) return null;

  const { top, home, bottom } = getLayoutRows(keyboardLayout);
  const totalLetters = top.length + home.length + bottom.length;

  // Which physical keys to dim on the on-screen keyboard — every code whose
  // current layout produces a letter that isn't unlocked yet, plus every
  // punctuation-position key (semicolon, comma, etc.) since those are never
  // part of this letter-unlock system and never used here. The spacebar is
  // the only key never dimmed; it's always available.
  const codeToChar = KEYBOARD_LAYOUTS[keyboardLayout];
  const rowCodes = getLayoutRowCodes(keyboardLayout);
  const dimmedCodes = new Set(
    [...rowCodes.top, ...rowCodes.home, ...rowCodes.bottom].filter(code => {
      const letter = codeToChar[code];
      if (letter === undefined) return false;
      // The physical Semicolon-position key is always shown at full
      // opacity, whatever it currently displays for the selected layout
      // (";" on qwerty, "o" on Colemak, "s" on Dvorak) — purely a visual
      // landmark key, still never exempted from the actual unlock/practice
      // data below. Every other punctuation key (e.g. the literal ";" that
      // shows up elsewhere on Colemak/Dvorak) still dims normally.
      if (code === 'Semicolon') return false;
      if (!/^[a-z]$/.test(letter)) return true;
      return !unlockedLetters.includes(letter);
    })
  );

  // Per-code accuracy for the keyboard's red->green tint — only unlocked
  // letters have any accuracy data to show.
  const accuracyByCode: Record<string, number> = {};
  for (const code of [...rowCodes.top, ...rowCodes.home, ...rowCodes.bottom]) {
    const letter = codeToChar[code];
    if (letter !== undefined && letter in letterAccuracy) accuracyByCode[code] = letterAccuracy[letter];
  }

  return (
    <div className="flex-1 flex flex-col py-10 px-6">
      <div className="max-w-4xl w-full mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-8">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--text-correct)]">learn</h1>
        <Link
          to="/"
          className="text-sm border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)] text-[var(--text-secondary)] px-4 py-2 rounded-lg transition-colors"
        >
          back to test
        </Link>
      </div>

      {/* Centered the same way Home.tsx centers TypingTest+OnScreenKeyboard
          (same width breakpoints, same mt-10 gap before the keyboard) so it
          lands at the same height on both pages — within this remaining
          space below the header, not the full page, since unlike Home this
          page has a header above it. justify-center-safe is the flex-col
          equivalent of Home's items-center-safe (main axis is vertical
          here, not horizontal). The progress row uses the header's own
          max-w-4xl width instead of the narrower typing/keyboard column, so
          "letters unlocked"/"reset progress" line up with "learn"/"back to
          test" above. */}
      {/* Learn mode needs a physical keyboard for finger placement to mean
          anything — a touchscreen on-screen keyboard has no fixed key
          positions to build muscle memory around. */}
      <div className="sm:hidden flex-1 flex flex-col items-center justify-center text-center gap-2 px-6 pb-16">
        <p className="text-[var(--text-correct)] font-semibold">Learn mode needs a physical keyboard</p>
        <p className="text-[var(--text-muted)] text-sm max-w-sm">
          Finger placement practice doesn't translate to a touchscreen — open this page on a laptop or desktop
          instead.
        </p>
      </div>

      <div className="hidden sm:flex flex-1 flex-col justify-center-safe items-center">
        <div className="w-[92%] sm:w-[80%] lg:w-[65%]">
          <TypingTest
            key={roundKey}
            config={{ mode: 'words', value: ROUND_WORD_COUNT }}
            fixedText={practiceText}
            skipStatsSave
            hidePracticeCaption
            onCharacterResult={handleCharacterResult}
            onComplete={handleRoundComplete}
            onRestart={handleRestart}
          />
        </div>

        <div className="max-w-4xl w-full mt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wide">
              {unlockedLetters.length}/{totalLetters} letters unlocked
            </h2>
            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--text-incorrect)] transition-colors cursor-pointer"
            >
              reset progress
            </button>
          </div>

          <p className="text-xs text-[var(--text-muted)] mt-1">symbols shown on the keyboard are for reference only — they're never used in practice text.</p>

          {justUnlocked && <p className="text-sm text-[var(--accent)] font-semibold mt-1">new letter unlocked: {justUnlocked}</p>}

          {!user && (
            <p className="text-xs text-[var(--text-muted)] mt-1">
              playing as a guest — progress is saved to this browser only.{' '}
              <Link to="/profile" className="text-[var(--accent)] hover:underline">
                sign in
              </Link>{' '}
              to sync it across devices.
            </p>
          )}
        </div>

        <div className="max-w-4xl w-full mt-10 flex items-center justify-between">
          <p className="text-sm font-medium text-[var(--text-secondary)]">on-screen keyboard</p>
          <Toggle checked={showKeyboardDisplay} onChange={setShowKeyboardDisplay} />
        </div>

        {showKeyboardDisplay && (
          <div className="w-[92%] sm:w-[80%] lg:w-[65%] mt-4">
            <KeyboardDisplay
              keyboardLayout={keyboardLayout}
              dimmedCodes={dimmedCodes}
              accuracyByCode={accuracyByCode}
              keyColors="colors-and-text"
              pressStyle="finger"
            />
          </div>
        )}
      </div>

      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6">
          <div className="w-full max-w-sm bg-[var(--surface)] border border-[var(--border)] rounded-xl p-8">
            <h2 className="text-lg font-semibold text-[var(--text-correct)] mb-1">reset your progress?</h2>
            <p className="text-[var(--text-muted)] text-sm mb-4">
              This resets your unlocked letters back to the starting set and clears your accuracy history. This can't
              be undone.
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 text-sm border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)] text-[var(--text-secondary)] px-4 py-2.5 rounded-lg transition-colors cursor-pointer"
              >
                cancel
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="flex-1 text-sm bg-[var(--text-incorrect)] hover:brightness-110 text-[var(--bg)] px-4 py-2.5 rounded-lg font-semibold transition-all cursor-pointer"
              >
                reset progress
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
