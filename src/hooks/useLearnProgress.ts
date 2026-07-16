import { useContext } from 'react';
import { LearnProgressContext } from '../context/LearnProgressContextBase.js';

export function useLearnProgress() {
  const context = useContext(LearnProgressContext);
  if (!context) {
    throw new Error('useLearnProgress must be used within LearnProgressProvider');
  }
  return context;
}
