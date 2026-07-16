import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../hooks/useAuth.js';
import { useSettings } from '../hooks/useSettings.js';
import { anchorLetters, type LetterAccuracy } from '../utils/learnMode.js';
import { LearnProgressContext } from './LearnProgressContextBase.js';

// Guests keep progress in sessionStorage, per keyboard layout — cleared when
// the tab closes, unlike the account-synced version below which follows a
// signed-in user across devices.
const SESSION_STORAGE_PREFIX = 'learnProgress_';

interface StoredProgress {
  unlockedLetters: string;
  letterAccuracy: LetterAccuracy;
  totalRepsSinceUnlock: number;
}

function loadSessionProgress(layout: string): StoredProgress | null {
  try {
    const raw = sessionStorage.getItem(`${SESSION_STORAGE_PREFIX}${layout}`);
    return raw ? (JSON.parse(raw) as StoredProgress) : null;
  } catch {
    return null;
  }
}

function saveSessionProgress(layout: string, progress: StoredProgress) {
  try {
    sessionStorage.setItem(`${SESSION_STORAGE_PREFIX}${layout}`, JSON.stringify(progress));
  } catch {
    // ignore unavailable storage
  }
}

// Lives at the app root (see App.tsx) rather than inside the Learn page
// itself — the page used to load/save its own progress on mount/unmount,
// which meant navigating away and back re-ran the fetch from scratch and,
// combined with any hiccup in that round trip, could look like progress
// had "reset". Keeping the state here means it's fetched once per
// sign-in/layout and simply persists in memory across route changes.
export function LearnProgressProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id ?? null;
  const { keyboardLayout } = useSettings();

  const [loading, setLoading] = useState(true);
  const [unlockedLetters, setUnlockedLetters] = useState<string[]>([]);
  const [letterAccuracy, setLetterAccuracy] = useState<LetterAccuracy>({});
  const [totalRepsSinceUnlock, setTotalRepsSinceUnlock] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const applyFresh = () => {
      const fresh = anchorLetters(keyboardLayout);
      setUnlockedLetters(fresh);
      setLetterAccuracy({});
      setTotalRepsSinceUnlock(0);
    };

    const applyStored = (unlocked: string, letterAcc: LetterAccuracy, reps: number) => {
      setUnlockedLetters(unlocked.split(''));
      setLetterAccuracy(letterAcc ?? {});
      setTotalRepsSinceUnlock(reps ?? 0);
    };

    const load = async () => {
      // Still resolving whether there's a session at all — deciding
      // guest-vs-account before this settles risks briefly treating a
      // signed-in user as a guest.
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
        const stored = loadSessionProgress(keyboardLayout);
        if (stored) applyStored(stored.unlockedLetters, stored.letterAccuracy, stored.totalRepsSinceUnlock);
        else applyFresh();
      }

      if (cancelled) return;
      setLoading(false);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [userId, keyboardLayout, authLoading]);

  const saveProgress = (nextUnlocked: string[], nextAccuracy: LetterAccuracy, nextReps: number) => {
    setUnlockedLetters(nextUnlocked);
    setLetterAccuracy(nextAccuracy);
    setTotalRepsSinceUnlock(nextReps);

    if (userId && supabase) {
      void supabase
        .rpc('save_learn_progress', {
          p_keyboard_layout: keyboardLayout,
          p_unlocked_letters: nextUnlocked.join(''),
          p_letter_accuracy: nextAccuracy,
          p_total_reps_since_unlock: nextReps,
        })
        .then(({ error }) => {
          if (error) console.error('save_learn_progress failed:', error.message);
        });
    } else {
      saveSessionProgress(keyboardLayout, {
        unlockedLetters: nextUnlocked.join(''),
        letterAccuracy: nextAccuracy,
        totalRepsSinceUnlock: nextReps,
      });
    }
  };

  const resetProgress = () => {
    saveProgress(anchorLetters(keyboardLayout), {}, 0);
  };

  return (
    <LearnProgressContext.Provider
      value={{ unlockedLetters, letterAccuracy, totalRepsSinceUnlock, loading, saveProgress, resetProgress }}
    >
      {children}
    </LearnProgressContext.Provider>
  );
}
