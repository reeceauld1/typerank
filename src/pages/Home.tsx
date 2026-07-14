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
    <div className="flex-1 flex items-center justify-center px-6 py-10">
      <div className="relative w-[92%] sm:w-[80%] lg:w-[65%]">
        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-6">
          <AnimatePresence>
            {!typingActive && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <ModeSelector config={config} onChange={handleConfigChange} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

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
          <div className="mt-10">
            <OnScreenKeyboard />
          </div>
        )}
      </div>
    </div>
  );
}
