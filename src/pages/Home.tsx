import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { TestConfig } from '../types/index.js';
import TypingTest from '../components/TypingTest.js';
import ModeSelector from '../components/ModeSelector.js';
import OnScreenKeyboard from '../components/OnScreenKeyboard.js';
import { useSettings } from '../hooks/useSettings.js';

const CONFIG_KEY = 'testConfig';

function loadConfig(): TestConfig {
  try {
    const saved = localStorage.getItem(CONFIG_KEY);
    if (saved) return JSON.parse(saved);
  } catch {
    // ignore malformed/unavailable storage, fall back to the default below
  }
  return { mode: 'time', value: 30 };
}

function pillClass(active: boolean): string {
  return `px-3 py-1.5 rounded-md text-sm font-bold transition-colors cursor-pointer ${
    active ? 'text-[var(--accent)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
  }`;
}

export default function Home() {
  const [config, setConfig] = useState<TestConfig>(loadConfig);
  const [key, setKey] = useState(0);
  const [typingActive, setTypingActive] = useState(false);
  const [finished, setFinished] = useState(false);
  const { showKeyboard, punctuation, setPunctuation, numbers, setNumbers } = useSettings();
  // Read by the freshly-mounted TypingTest instance below (set just before
  // each key bump) to tell a manual restart — which should keep the caret
  // hidden until the first keystroke — apart from a config change or the
  // initial mount, which shouldn't.
  const [manualRestart, setManualRestart] = useState(false);

  useEffect(() => {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  }, [config]);

  const handleConfigChange = (newConfig: TestConfig) => {
    setManualRestart(false);
    setConfig(newConfig);
    setKey(prev => prev + 1);
    setFinished(false);
  };

  // Punctuation/numbers only ever toggle while the toggles themselves are
  // visible - the parent fades and disables pointer events on them the
  // moment typing starts (see typingActive below) - so a fresh test never
  // interrupts one in progress here.
  const handleTextOptionToggle = () => {
    setManualRestart(false);
    setKey(prev => prev + 1);
    setFinished(false);
  };

  // Lets the navbar logo (rendered outside this page, with no shared state)
  // restart the current test when it's clicked while already on "/" — see
  // Navbar.tsx's handleLogoClick.
  useEffect(() => {
    const handleReset = () => {
      // Resetting from the end screen shows the new test's caret right
      // away; resetting mid-test keeps it hidden until the first keystroke.
      setManualRestart(!finished);
      setKey(prev => prev + 1);
      setFinished(false);
    };
    window.addEventListener('typeladder:reset-test', handleReset);
    return () => window.removeEventListener('typeladder:reset-test', handleReset);
  }, [finished]);

  return (
    // items-center-safe (native CSS "safe center" alignment) falls back to
    // start-alignment instead of centering-and-overflowing when the content
    // is taller than the available space (e.g. zoomed in, or a short
    // viewport) — without it, the mode selector above TypingTest could get
    // pushed up past the top of the screen with no way to reach it.
    <div className="flex-1 flex items-center-safe justify-center px-6 py-10">
      <div className="w-[92%] sm:w-[80%] lg:w-[65%]">
        {/* Kept mounted (just faded/pointer-events toggled) rather than
            unmounted while typing — unmounting collapsed this row's height
            and shifted the text block below it up to re-center. */}
        <motion.div
          initial={false}
          animate={{ opacity: typingActive ? 0 : 1 }}
          transition={{ duration: 0.2 }}
          aria-hidden={typingActive}
          inert={typingActive}
          className={`flex flex-wrap justify-center gap-2 mb-6 ${typingActive ? 'pointer-events-none' : ''}`}
        >
          <ModeSelector config={config} onChange={handleConfigChange} />
          <div className="flex items-center justify-center gap-1 bg-[var(--surface)] border border-[var(--border)] rounded-lg px-2 py-2 text-xs">
            <button
              type="button"
              onClick={() => {
                setPunctuation(!punctuation);
                handleTextOptionToggle();
              }}
              className={pillClass(punctuation)}
            >
              punctuation
            </button>
            <button
              type="button"
              onClick={() => {
                setNumbers(!numbers);
                handleTextOptionToggle();
              }}
              className={pillClass(numbers)}
            >
              numbers
            </button>
          </div>
        </motion.div>

        <TypingTest
          key={key}
          config={config}
          suppressCaretOnMount={manualRestart}
          onComplete={() => setFinished(true)}
          onRestart={wasFinished => {
            setManualRestart(!wasFinished);
            setKey(prev => prev + 1);
            setFinished(false);
          }}
          onTypingActiveChange={setTypingActive}
        />

        {showKeyboard && !finished && (
          <div className="hidden sm:block mt-10">
            <OnScreenKeyboard />
          </div>
        )}
      </div>
    </div>
  );
}
