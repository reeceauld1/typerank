import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import type { TestConfig } from '../types/index.js';
import { generateText } from '../utils/words.js';
import { isRankedValue } from '../utils/xp.js';
import { useUser } from '../hooks/useUser.js';
import { useSettings } from '../hooks/useSettings.js';
import { KEYBOARD_LAYOUTS } from '../utils/keyboardLayouts.js';
import { motion, AnimatePresence } from 'framer-motion';

interface TypingTestProps {
  config: TestConfig;
  // Used by duels: both players type the same shared word list instead of
  // each generating their own random one.
  fixedText?: string;
  // Duels save their own xp separately (see DuelMatch.tsx's handleComplete)
  // rather than through this component's own addTestResult call below.
  skipStatsSave?: boolean;
  onComplete?: (stats: {
    wpm: number;
    accuracy: number;
    rawWpm: number;
    timeElapsed: number;
    correctChars: number;
    incorrectChars: number;
  }) => void;
  onRestart?: () => void;
  onTypingActiveChange?: (active: boolean) => void;
}

type CharStatus = 'pending' | 'correct' | 'incorrect' | 'extra' | 'missed';

// The caret's underline used to span whatever character it sat under, so it
// went very short on narrow letters like "i"/"l". Instead it's now a fixed
// width regardless of letter: the span is clipped to CARET_WIDTH and filled
// with enough repeated wide characters to guarantee the real text (and so
// the underline drawn under it) always overflows that width in any font, so
// the visible clipped underline is always exactly CARET_WIDTH long.
const CARET_WIDTH = 16;
const CARET_FILLER = 'W'.repeat(20);

export default function TypingTest({
  config,
  fixedText,
  skipStatsSave,
  onComplete,
  onRestart,
  onTypingActiveChange,
}: TypingTestProps) {
  const { addTestResult } = useUser();
  const { keyboardLayout, spaceStyle, wordListSize } = useSettings();
  const isInfinite = config.mode === 'time' && config.value === 'infinite';
  // Ranked = one of the fixed preset values (10/25/50 words, 10/30/60s) —
  // anything else (a custom count/duration, or infinite) is unranked
  // practice: half xp, and never touches a best-wpm/leaderboard column.
  const isRanked = !isInfinite && isRankedValue(config.mode, config.value as number);
  // Time mode starts with a modest word buffer and extends itself as the
  // typist approaches the end (see the effect below) rather than
  // pre-generating enough words to cover the whole duration up front —
  // for a long custom duration that upfront amount could run into the
  // thousands of words, which made every keystroke re-render (and the
  // browser lay out) that entire word list, not just the ~100 actually
  // visible at once.
  // Home.tsx remounts this component (via a `key` bump) on every config
  // change, so `config` is effectively fixed for this instance's lifetime —
  // safe to seed the initial text lazily instead of via a mount effect.
  const [text, setText] = useState(() => fixedText ?? generateText(config.mode === 'words' ? config.value : 100, wordListSize));
  const [input, setInput] = useState('');
  const [startTime, setStartTime] = useState<number | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [elapsedDisplay, setElapsedDisplay] = useState(0);
  const [stats, setStats] = useState({ wpm: 0, accuracy: 0, rawWpm: 0 });
  const inputRef = useRef<HTMLInputElement>(null);
  const linesRef = useRef<HTMLDivElement>(null);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [lineHeight, setLineHeight] = useState(50);
  const [scrollLine, setScrollLine] = useState(0);
  const [caretPos, setCaretPos] = useState<{ left: number; top: number; instant: boolean } | null>(null);
  const prevWordIndexRef = useRef(0);
  const prevTopRef = useRef<number | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const prevInputRef = useRef('');
  const totalKeystrokesRef = useRef(0);
  const correctKeystrokesRef = useRef(0);
  const capsLockRef = useRef(false);

  const words = text.split(' ');
  const inputWords = input.split(' ');

  const finishTestRef = useRef<() => void>(() => {});

  const resetTest = () => {
    setText(fixedText ?? generateText(config.mode === 'words' ? config.value : 100, wordListSize));
    setInput('');
    setStartTime(null);
    setIsActive(false);
    setIsFinished(false);
    setElapsedDisplay(0);
    setCurrentWordIndex(0);
    setScrollLine(0);
    setCaretPos(null);
    prevWordIndexRef.current = 0;
    prevTopRef.current = null;
    setIsPaused(false);
    prevInputRef.current = '';
    totalKeystrokesRef.current = 0;
    correctKeystrokesRef.current = 0;
    inputRef.current?.focus();
  };

  // Marks the test active/unpaused and records one keystroke (space or
  // letter) against the current word, mirroring what the diffing loop in
  // handleInputChange does per-character — used by the alternate-layout
  // path below, which only ever adds one character per keydown.
  const appendChar = (ch: string) => {
    if (!isActive) {
      setIsActive(true);
      setStartTime(Date.now());
    }
    if (isPaused) setIsPaused(false);

    const priorWords = input.split(' ');
    const wIdx = priorWords.length - 1;
    const cIdx = priorWords[wIdx].length;

    if (ch === ' ') {
      const target = words[wIdx] ?? '';
      for (let m = cIdx; m < target.length; m++) {
        totalKeystrokesRef.current += 1;
      }
      totalKeystrokesRef.current += 1;
      correctKeystrokesRef.current += 1;
    } else {
      totalKeystrokesRef.current += 1;
      if (ch === words[wIdx]?.[cIdx]) {
        correctKeystrokesRef.current += 1;
      }
    }

    const value = input + ch;
    prevInputRef.current = value;
    setInput(value);
    setCurrentWordIndex(value.split(' ').length - 1);
  };

  const removeLastChar = () => {
    if (input.length === 0) return;
    const value = input.slice(0, -1);
    prevInputRef.current = value;
    setInput(value);
    setCurrentWordIndex(value.split(' ').length - 1);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.getModifierState) capsLockRef.current = e.getModifierState('CapsLock');

    if (keyboardLayout === 'qwerty') {
      // Block spacebar as the first keypress of a word — otherwise spamming
      // space with nothing typed skips through the whole test almost
      // instantly, which (before this) still scored as fast, accurate typing.
      if (e.key === ' ') {
        const segments = input.split(' ');
        const currentSegment = segments[segments.length - 1];
        if (currentSegment.length === 0) {
          e.preventDefault();
        }
      }
      return;
    }

    // Non-QWERTY layout: the browser still thinks it's typing on a QWERTY
    // board, so its native character output is wrong for what we want here.
    // Every relevant key is remapped and inserted manually instead of
    // letting the native input (and handleInputChange) handle it — see
    // src/utils/keyboardLayouts.ts.
    if (e.ctrlKey || e.metaKey || e.altKey) return; // leave OS/browser shortcuts alone

    if (e.key === 'Backspace') {
      e.preventDefault();
      removeLastChar();
      return;
    }

    if (e.key === ' ' || e.code === 'Space') {
      e.preventDefault();
      const segments = input.split(' ');
      if (segments[segments.length - 1].length === 0) return; // same anti-spam rule as qwerty
      appendChar(' ');
      return;
    }

    const base = KEYBOARD_LAYOUTS[keyboardLayout][e.code];
    if (!base || !/^[a-z]$/.test(base)) return; // key produces punctuation in this layout — nothing to type
    e.preventDefault();
    // Caps lock always forces lowercase (matching the qwerty path's
    // deliberate override below) instead of the real-keyboard XOR with
    // shift — otherwise leaving caps lock on made every letter come out
    // uppercase and mismatch the lowercase target text.
    const letter = capsLockRef.current ? base : e.shiftKey ? base.toUpperCase() : base;
    appendChar(letter);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only relevant for qwerty: everything else is typed manually via
    // handleInputKeyDown above, so any native change here is stale/ignored.
    if (keyboardLayout !== 'qwerty') return;

    const value = capsLockRef.current ? e.target.value.toLowerCase() : e.target.value;
    const prevValue = prevInputRef.current;

    if (!isActive && value.length > 0) {
      setIsActive(true);
      setStartTime(Date.now());
    }

    if (isPaused) {
      setIsPaused(false);
    }

    // Only count forward-typed (appended) characters toward accuracy, so that
    // fixing a mistake with backspace doesn't erase the fact it was ever wrong.
    // Tracked per-word (not by raw flat-string index) so that one length
    // mismatch (an overflow letter, or a word skipped early via space)
    // doesn't throw off every keystroke typed afterward.
    if (value.length > prevValue.length && value.startsWith(prevValue)) {
      const priorWords = prevValue.split(' ');
      let wIdx = priorWords.length - 1;
      let cIdx = priorWords[wIdx].length;
      const added = value.slice(prevValue.length);

      for (const ch of added) {
        if (ch === ' ') {
          // Any letters left untyped in this word were skipped via spacebar —
          // they count as missed (wrong) attempts even though never pressed.
          const target = words[wIdx] ?? '';
          for (let m = cIdx; m < target.length; m++) {
            totalKeystrokesRef.current += 1;
          }
          totalKeystrokesRef.current += 1;
          correctKeystrokesRef.current += 1;
          wIdx += 1;
          cIdx = 0;
        } else {
          totalKeystrokesRef.current += 1;
          if (ch === words[wIdx]?.[cIdx]) {
            correctKeystrokesRef.current += 1;
          }
          cIdx += 1;
        }
      }
    }
    prevInputRef.current = value;

    setInput(value);

    const currentWords = value.split(' ');
    setCurrentWordIndex(currentWords.length - 1);
  };

  const finishTest = () => {
    if (isFinished || !startTime) return;

    setIsActive(false);
    setIsFinished(true);

    const timeElapsed = (Date.now() - startTime) / 1000;

    let correctChars = 0;
    let incorrectChars = 0;

    inputWords.forEach((typedWord, w) => {
      const targetWord = words[w] ?? '';
      for (let i = 0; i < typedWord.length; i++) {
        if (i < targetWord.length && typedWord[i] === targetWord[i]) {
          correctChars++;
        } else {
          incorrectChars++;
        }
      }
      if (w < inputWords.length - 1) {
        // the space typed between words
        correctChars++;
        // Letters left untyped when a word was skipped early (spacebar hit
        // before finishing it) were never attempted — they still count
        // against accuracy/raw WPM, same as the "missed" chars shown in the
        // UI, so skipping through words doesn't read as flawless typing.
        if (typedWord.length < targetWord.length) {
          incorrectChars += targetWord.length - typedWord.length;
        }
      }
    });

    const totalChars = correctChars + incorrectChars;
    const keystrokeTotal = totalKeystrokesRef.current;
    const accuracy = keystrokeTotal > 0 ? (correctKeystrokesRef.current / keystrokeTotal) * 100 : 0;
    const wpm = Math.round(correctChars / 5 / (timeElapsed / 60));
    const rawWpm = Math.round(totalChars / 5 / (timeElapsed / 60));

    const finalStats = {
      wpm: Math.max(0, wpm),
      accuracy: Math.round(accuracy),
      rawWpm: Math.max(0, rawWpm),
    };

    setStats(finalStats);

    // Unranked runs (infinite mode, or any custom word count/duration) have
    // no fixed category to rank against, so they're saved under a 0
    // sentinel value (never a real category, so it can't update any
    // best-wpm/leaderboard column) and earn half the usual XP.
    if (!skipStatsSave) {
      const submittedValue = isRanked ? (config.value as number) : 0;
      void addTestResult(
        {
          mode: config.mode,
          value: submittedValue,
          wpm: finalStats.wpm,
          accuracy: finalStats.accuracy,
          rawWpm: finalStats.rawWpm,
          correctChars,
          incorrectChars,
          timeElapsed,
        },
        isRanked ? 1 : 0.5
      );
    }

    onComplete?.({ ...finalStats, timeElapsed, correctChars, incorrectChars });
  };

  useEffect(() => {
    finishTestRef.current = finishTest;
  });

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (isActive && config.mode === 'time') {
      const timer = setInterval(() => {
        const elapsed = (Date.now() - (startTime || Date.now())) / 1000;
        setElapsedDisplay(elapsed);
        // Infinite time just counts up forever — no target to auto-finish at.
        if (config.value !== 'infinite' && elapsed >= config.value) {
          finishTestRef.current();
        }
      }, 100);
      return () => clearInterval(timer);
    }
  }, [isActive, startTime, config]);

  useEffect(() => {
    if (config.mode === 'words' && isActive) {
      const lastWordIndex = words.length - 1;
      const targetLastWord = words[lastWordIndex] ?? '';
      const typedLastWord = inputWords[lastWordIndex] ?? '';
      // A space on the last word (even skipping the rest of it, same as any
      // other word) moves currentWordIndex past lastWordIndex — that alone
      // should finish the test, not just typing it out to full length.
      const movedPastLastWord = currentWordIndex > lastWordIndex;
      const typedLastWordInFull =
        targetLastWord.length > 0 && currentWordIndex >= lastWordIndex && typedLastWord.length >= targetLastWord.length;

      if (movedPastLastWord || typedLastWordInFull) {
        finishTestRef.current();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, config, isActive, currentWordIndex]);

  // Time mode (any duration, including infinite) tops up the word list as
  // the typist nears the end, instead of generating the whole thing up
  // front — keeps the live word count (and so the per-keystroke render
  // cost) small regardless of how long the test runs. Duels skip this:
  // fixedText is one static string both players were given identically.
  useEffect(() => {
    if (fixedText || config.mode !== 'time' || !isActive) return;
    if (words.length - currentWordIndex < 30) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setText(prev => `${prev} ${generateText(60, wordListSize)}`);
    }
  }, [fixedText, config.mode, isActive, currentWordIndex, words.length, wordListSize]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab' && !e.shiftKey && isInfinite && isActive && !isFinished) {
        // Infinite mode has no natural end, so Tab finishes it and shows
        // results instead of restarting (matching every other mode's Tab
        // shortcut would just throw away the run with nothing to show).
        e.preventDefault();
        finishTestRef.current();
        return;
      }
      if (e.key === 'Escape' || (e.key === 'Tab' && !e.shiftKey)) {
        e.preventDefault();
        resetTest();
        onRestart?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInfinite, isActive, isFinished]);

  useEffect(() => {
    const shouldHideCursor = isActive && isFocused && !isPaused;
    document.body.classList.toggle('is-typing', shouldHideCursor);
    return () => document.body.classList.remove('is-typing');
  }, [isActive, isFocused, isPaused]);

  useEffect(() => {
    onTypingActiveChange?.(isActive && isFocused && !isPaused);
  }, [isActive, isFocused, isPaused, onTypingActiveChange]);

  useEffect(() => {
    const handleMouseMove = () => {
      if (isActive && isFocused && !isPaused) {
        setIsPaused(true);
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isActive, isFocused, isPaused]);

  useEffect(() => {
    const handleWindowBlur = () => setIsFocused(false);
    window.addEventListener('blur', handleWindowBlur);
    return () => window.removeEventListener('blur', handleWindowBlur);
  }, []);

  useLayoutEffect(() => {
    const linesEl = linesRef.current;
    if (!linesEl) return;

    const measuredLineHeight = parseFloat(getComputedStyle(linesEl).lineHeight);
    if (measuredLineHeight && Math.abs(measuredLineHeight - lineHeight) > 0.5) {
      setLineHeight(measuredLineHeight);
    }

    const wordEl = linesEl.querySelector<HTMLElement>(`[data-word-idx="${currentWordIndex}"]`);
    if (!wordEl) return;

    const typedLen = inputWords[currentWordIndex]?.length ?? 0;
    const charEls = wordEl.querySelectorAll<HTMLElement>('[data-char-idx]');

    let target: HTMLElement | null = null;
    let atEnd = false;
    if (typedLen < charEls.length) {
      target = charEls[typedLen] ?? null;
    } else if (charEls.length > 0) {
      target = charEls[charEls.length - 1];
      atEnd = true;
    }

    // Past the last typed character (atEnd), the caret sits right after it;
    // otherwise it centers on the upcoming character, not its left edge —
    // "type here" reads better centered than edge-aligned once the caret is
    // a fixed width instead of matching that letter's own width.
    const left = target
      ? atEnd
        ? target.offsetLeft + target.offsetWidth
        : target.offsetLeft + (target.offsetWidth - CARET_WIDTH) / 2
      : wordEl.offsetLeft;
    const top = target ? target.offsetTop : wordEl.offsetTop;

    // Snap instantly on a new word or a new line — animating those larger
    // jumps risks the caret still being mid-transition (and briefly visible
    // in the wrong spot) if a keystroke lands before the previous move
    // finished. Only glide smoothly for the common case: advancing one
    // character within the same word.
    const wordChanged = currentWordIndex !== prevWordIndexRef.current;
    const lineChanged = prevTopRef.current !== null && prevTopRef.current !== top;
    const instant = wordChanged || lineChanged || prevTopRef.current === null;
    prevWordIndexRef.current = currentWordIndex;
    prevTopRef.current = top;

    setCaretPos({ left, top, instant });

    if (measuredLineHeight) {
      const currentLine = Math.round(top / measuredLineHeight);
      setScrollLine(prev => {
        // As soon as typing reaches the 3rd of the 4 visible lines, scroll up by
        // one line so the first line is no longer visible.
        if (currentLine >= prev + 2) return currentLine - 1;
        if (currentLine < prev) return currentLine;
        return prev;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, currentWordIndex, text]);

  const getWordChars = (wordIndex: number): { char: string; status: CharStatus }[] => {
    const target = words[wordIndex] ?? '';
    const typed = wordIndex <= currentWordIndex ? inputWords[wordIndex] ?? '' : '';
    const isPastWord = wordIndex < currentWordIndex;
    const length = Math.max(target.length, typed.length);
    const chars: { char: string; status: CharStatus }[] = [];

    for (let i = 0; i < length; i++) {
      if (i < target.length) {
        if (i < typed.length) {
          chars.push({ char: target[i], status: typed[i] === target[i] ? 'correct' : 'incorrect' });
        } else {
          // Word was already left behind (space hit early) without this letter ever being typed.
          chars.push({ char: target[i], status: isPastWord ? 'missed' : 'pending' });
        }
      } else {
        chars.push({ char: typed[i], status: 'extra' });
      }
    }
    return chars;
  };

  const charClass: Record<CharStatus, string> = {
    pending: 'text-[var(--text-muted)]',
    missed: 'text-[var(--text-muted)] underline decoration-2 decoration-[var(--text-incorrect)] underline-offset-[3px]',
    correct: 'text-[var(--text-correct)]',
    incorrect: 'text-[var(--text-incorrect)]',
    extra: 'text-[var(--text-incorrect)]',
  };
  const mistakeUnderline = 'underline decoration-2 decoration-[var(--text-incorrect)] underline-offset-[3px]';

  const timeRemaining =
    config.mode === 'time' && config.value !== 'infinite' ? Math.max(0, config.value - elapsedDisplay) : null;

  let textOpacity = 1;
  let textFilter = 'none';
  if (!isFocused) {
    textOpacity = 0.55;
    textFilter = 'blur(1.5px)';
  } else if (isPaused) {
    textOpacity = 0.7;
  }

  return (
    <div className="w-full flex flex-col items-center">
      <div className="w-full flex justify-between items-center mb-6 h-8 px-1">
        <div className="text-xl font-semibold text-[var(--accent)] tabular-nums">
          {isActive
            ? config.mode === 'time'
              ? config.value === 'infinite'
                ? Math.floor(elapsedDisplay)
                : Math.ceil(timeRemaining ?? 0)
              : `${Math.min(currentWordIndex + 1, config.value)}/${config.value}`
            : ''}
        </div>
        {!isFinished && !isFocused && (
          <div className="text-xs text-[var(--text-muted)] tracking-wide">click to focus</div>
        )}
        {!isFinished && isFocused && isPaused && (
          <div className="text-xs text-[var(--text-muted)] tracking-wide">keep typing to resume</div>
        )}
      </div>

      <div className="relative w-full">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          disabled={isFinished}
          autoFocus
          spellCheck={false}
          autoComplete="off"
          autoCapitalize="off"
          className="absolute opacity-0 w-px h-px pointer-events-none"
        />

        <div
          role="button"
          tabIndex={-1}
          onClick={() => inputRef.current?.focus()}
          className="relative cursor-text select-none"
        >
          <AnimatePresence mode="wait">
            {isFinished ? (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="w-full max-w-full sm:max-w-[50vw] mx-auto bg-[var(--surface)] border border-[var(--border)] rounded-xl px-6 sm:px-10 py-10"
              >
                <div className="grid grid-cols-3 gap-6 mb-8 text-center">
                  <div>
                    <div className="text-3xl sm:text-5xl font-semibold text-[var(--accent)] tabular-nums">{stats.wpm}</div>
                    <div className="text-xs text-[var(--text-muted)] mt-2 tracking-widest uppercase">wpm</div>
                  </div>
                  <div>
                    <div className="text-3xl sm:text-5xl font-semibold text-[var(--text-correct)] tabular-nums">{stats.accuracy}%</div>
                    <div className="text-xs text-[var(--text-muted)] mt-2 tracking-widest uppercase">accuracy</div>
                  </div>
                  <div>
                    <div className="text-3xl sm:text-5xl font-semibold text-[var(--text-secondary)] tabular-nums">{stats.rawWpm}</div>
                    <div className="text-xs text-[var(--text-muted)] mt-2 tracking-widest uppercase">raw</div>
                  </div>
                </div>
                {!isRanked && (
                  <p className="text-center text-xs text-[var(--text-muted)] mb-4">practice mode — half xp, not ranked</p>
                )}
                <button
                  onClick={() => {
                    resetTest();
                    onRestart?.();
                  }}
                  className="w-full bg-[var(--accent)] hover:brightness-110 text-[var(--bg)] px-6 py-3 rounded-lg font-semibold transition-all cursor-pointer"
                >
                  try again
                </button>
                <p className="hidden sm:block text-center text-xs text-[var(--text-muted)] mt-4">press tab to restart instantly</p>
              </motion.div>
            ) : (
              <motion.div
                key="test"
                initial={{ opacity: 0 }}
                animate={{ opacity: textOpacity }}
                transition={{ duration: 0.2 }}
                className="w-full overflow-hidden"
                style={{ filter: textFilter, height: lineHeight * 4 }}
              >
                <div
                  ref={linesRef}
                  className="relative text-[28px] md:text-[32px] leading-[1.7] font-medium tracking-wide"
                  style={{
                    transform: `translateY(-${scrollLine * lineHeight}px)`,
                    transition: 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                >
                  {words.map((_word, wordIdx) => {
                    const chars = getWordChars(wordIdx);
                    const isPastWord = wordIdx < currentWordIndex;
                    const wordHasMistake =
                      isPastWord && chars.some(c => c.status === 'incorrect' || c.status === 'extra' || c.status === 'missed');
                    const isLastWord = wordIdx === words.length - 1;
                    return (
                      // A wrapping outer span (rather than a Fragment) makes the word and
                      // its trailing separator a single atomic unit for line-wrapping — the
                      // browser can only break before/after this box, never between the two
                      // children, so a line can never start with an orphaned separator
                      // (which used to shift that line's visible text start out of
                      // alignment with the others).
                      <span key={wordIdx} className="inline-block">
                        <span data-word-idx={wordIdx} className="inline-block">
                          {chars.map((c, charIdx) => (
                            <span
                              key={charIdx}
                              data-char-idx={charIdx}
                              className={
                                wordHasMistake && c.status !== 'missed'
                                  ? `${charClass[c.status]} ${mistakeUnderline}`
                                  : charClass[c.status]
                              }
                            >
                              {c.char}
                            </span>
                          ))}
                        </span>
                        <span
                          aria-hidden="true"
                          className={`inline-flex justify-center align-middle shrink-0 ${
                            spaceStyle === 'underscore' ? 'items-end pb-[2px]' : 'items-center'
                          }`}
                          style={{ width: CARET_WIDTH, height: '1em' }}
                        >
                          {!isLastWord && spaceStyle === 'underscore' && (
                            <span className="block bg-[var(--text-muted)]" style={{ width: 14, height: 3 }} />
                          )}
                          {!isLastWord && spaceStyle === 'dot' && (
                            <span className="block rounded-full bg-[var(--text-muted)]" style={{ width: 4, height: 4 }} />
                          )}
                        </span>
                      </span>
                    );
                  })}
                  {caretPos && (
                    <span
                      aria-hidden="true"
                      className="absolute left-0 top-0 inline-block overflow-hidden pointer-events-none whitespace-nowrap"
                      style={{
                        width: CARET_WIDTH,
                        color: 'transparent',
                        textDecorationLine: 'underline',
                        textDecorationColor: 'var(--accent)',
                        textDecorationThickness: '3px',
                        textUnderlineOffset: '8px',
                        textDecorationSkipInk: 'none',
                        transform: `translate(${caretPos.left}px, ${caretPos.top}px)`,
                        transition: caretPos.instant ? 'none' : 'transform 0.1s cubic-bezier(0.4, 0, 0.2, 1)',
                      }}
                    >
                      {CARET_FILLER}
                    </span>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {!isFinished && (
        <p className="hidden sm:block text-xs text-[var(--text-muted)] mt-8 tracking-wide">
          {isInfinite && isActive ? 'esc — restart · tab — finish' : 'esc / tab — restart'}
        </p>
      )}
    </div>
  );
}
