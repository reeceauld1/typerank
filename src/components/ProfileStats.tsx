import type { UserStats } from '../types/index.js';
import { useUser } from '../hooks/useUser.js';
import { getLevelProgress } from '../utils/xp.js';
import { motion } from 'framer-motion';

function formatTimeTyped(totalSeconds: number): string {
  const seconds = Math.round(totalSeconds);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
}

interface ProfileStatsProps {
  stats?: UserStats;
}

export default function ProfileStats({ stats: statsProp }: ProfileStatsProps = {}) {
  const { stats: ownStats } = useUser();
  const stats = statsProp ?? ownStats;
  const levelProgress = getLevelProgress(stats.totalXp);

  const avgAccuracy = stats.totalTests > 0 ? Math.round(stats.totalAccuracySum / stats.totalTests) : 0;
  const avgWpm = stats.totalTests > 0 ? Math.round(stats.totalWpmSum / stats.totalTests) : 0;

  const overview: { label: string; value: string }[] = [
    { label: 'time typed', value: formatTimeTyped(stats.totalTimeTyped) },
    { label: 'avg accuracy', value: `${avgAccuracy}%` },
    { label: 'avg wpm', value: `${avgWpm}` },
  ];

  const bests: { label: string; value: number }[] = [
    { label: '10 seconds', value: stats.bestWpm.time10 },
    { label: '30 seconds', value: stats.bestWpm.time30 },
    { label: '60 seconds', value: stats.bestWpm.time60 },
    { label: '10 words', value: stats.bestWpm.words10 },
    { label: '25 words', value: stats.bestWpm.words25 },
    { label: '50 words', value: stats.bestWpm.words50 },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-3xl font-semibold text-[var(--text-correct)]">Level {stats.level}</h2>
            <p className="text-[var(--text-muted)] text-sm mt-1">{stats.totalXp.toLocaleString()} total XP</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide">tests completed</p>
            <p className="text-2xl font-semibold text-[var(--text-correct)]">{stats.totalTests}</p>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs text-[var(--text-muted)] mb-2">
            <span>level progress</span>
            <span className="tabular-nums">{levelProgress.current} / {levelProgress.needed} XP</span>
          </div>
          <div className="w-full bg-[var(--bg-elevated)] rounded-full h-2.5 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${levelProgress.percentage}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="h-full bg-[var(--accent)] rounded-full"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {overview.map(o => (
          <div key={o.label} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 text-center">
            <p className="text-2xl font-semibold text-[var(--text-correct)] tabular-nums">{o.value}</p>
            <p className="text-[var(--text-muted)] text-xs mt-1 uppercase tracking-wide">{o.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6">
        <h3 className="text-lg font-semibold text-[var(--text-correct)] mb-4">Personal Bests</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {bests.map(b => (
            <div key={b.label} className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg p-4">
              <p className="text-[var(--text-muted)] text-xs mb-1">{b.label}</p>
              <p className="text-2xl font-semibold text-[var(--accent)] tabular-nums">{b.value} <span className="text-sm text-[var(--text-muted)] font-normal">wpm</span></p>
            </div>
          ))}
        </div>
      </div>

      {stats.testHistory.length > 0 && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 mt-6">
          <h3 className="text-lg font-semibold text-[var(--text-correct)] mb-4">Recent Tests</h3>
          <div className="space-y-2">
            {stats.testHistory.slice(0, 5).map(test => (
              <div key={test.id} className="flex items-center justify-between bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg p-3">
                <div className="flex items-center gap-4 text-sm">
                  <div className="text-[var(--text-muted)] w-12">
                    {test.value === 0 ? '∞' : test.mode === 'time' ? `${test.value}s` : `${test.value}w`}
                  </div>
                  <div className="font-semibold text-[var(--text-correct)]">{test.wpm} wpm</div>
                  <div className="text-[var(--text-muted)]">{test.accuracy}% acc</div>
                </div>
                <div className="text-sm text-[var(--accent)]">+{test.xpEarned} XP</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
