import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
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

export default function Home() {
  const [config, setConfig] = useState<TestConfig>(loadConfig);
  const [key, setKey] = useState(0);
  const [typingActive, setTypingActive] = useState(false);
  const [finished, setFinished] = useState(false);
  const { showKeyboard } = useSettings();

  useEffect(() => {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  }, [config]);

  const handleConfigChange = (newConfig: TestConfig) => {
    setConfig(newConfig);
    setKey(prev => prev + 1);
  };

  return (
    // items-center-safe (native CSS "safe center" alignment) falls back to
    // start-alignment instead of centering-and-overflowing when the content
    // is taller than the available space (e.g. zoomed in, or a short
    // viewport) — without it, the mode selector above TypingTest could get
    // pushed up past the top of the screen with no way to reach it.
    <div className="flex-1 flex items-center-safe justify-center px-6 py-10">
      <div className="w-[92%] sm:w-[80%] lg:w-[65%]">
        <AnimatePresence>
          {!typingActive && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex justify-center mb-6"
            >
              <ModeSelector config={config} onChange={handleConfigChange} />
            </motion.div>
          )}
        </AnimatePresence>

        <TypingTest
          key={key}
          config={config}
          onComplete={() => setFinished(true)}
          onRestart={() => {
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
