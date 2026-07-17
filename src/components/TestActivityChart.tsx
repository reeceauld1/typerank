import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import Tooltip from './Tooltip.js';

interface DayCell {
  iso: string;
  label: string;
  count: number;
  future: boolean;
}

const WEEKS = 53;
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// UTC-keyed, matching todayKey() in dailyChallenge.ts and the server's
// created_at::date bucketing — a local-timezone comparison here would shift
// which calendar day a late-night test lands on relative to what the RPC
// actually grouped it into.
function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function buildWeeks(counts: Map<string, number>): DayCell[][] {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const gridStart = new Date(today);
  gridStart.setUTCDate(today.getUTCDate() - today.getUTCDay() - (WEEKS - 1) * 7);

  const weeks: DayCell[][] = [];
  const cursor = new Date(gridStart);
  for (let w = 0; w < WEEKS; w++) {
    const week: DayCell[] = [];
    for (let d = 0; d < 7; d++) {
      const iso = isoDate(cursor);
      const future = cursor > today;
      week.push({
        iso,
        label: `${cursor.getUTCDate()} ${MONTH_NAMES[cursor.getUTCMonth()]} ${cursor.getUTCFullYear()}`,
        count: future ? 0 : (counts.get(iso) ?? 0),
        future,
      });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

function levelFor(count: number, max: number): number {
  if (count <= 0) return 0;
  if (max <= 1) return 4;
  const ratio = count / max;
  if (ratio > 0.75) return 4;
  if (ratio > 0.5) return 3;
  if (ratio > 0.25) return 2;
  return 1;
}

const LEVEL_STYLE: Record<number, React.CSSProperties> = {
  0: { backgroundColor: 'var(--bg-elevated)' },
  1: { backgroundColor: 'var(--heat-1)' },
  2: { backgroundColor: 'var(--heat-2)' },
  3: { backgroundColor: 'var(--heat-3)' },
  4: { backgroundColor: 'var(--heat-4)' },
};

export default function TestActivityChart({ userId }: { userId?: string }) {
  const [weeks, setWeeks] = useState<DayCell[][] | null>(null);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let cancelled = false;
    if (!supabase) return;

    supabase
      .rpc('get_daily_test_counts', { p_user_id: userId ?? null })
      .then(({ data }) => {
        if (cancelled) return;
        const counts = new Map<string, number>();
        let sum = 0;
        for (const row of (data ?? []) as { test_date: string; test_count: number }[]) {
          counts.set(row.test_date, row.test_count);
          sum += row.test_count;
        }
        setWeeks(buildWeeks(counts));
        setTotal(sum);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (!weeks) return null;

  const max = Math.max(0, ...weeks.flat().map(d => d.count));

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 mb-6">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-[var(--text-muted)]">{total} tests in the last year</span>
        <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)]">
          <span>less</span>
          {[0, 1, 2, 3, 4].map(level => (
            <div key={level} className="w-[11px] h-[11px] rounded-[2px] shrink-0" style={LEVEL_STYLE[level]} />
          ))}
          <span>most</span>
        </div>
      </div>
      <div className="flex gap-1">
        {weeks.map((week, w) => (
          <div key={w} className="flex-1 flex flex-col gap-1">
            {week.map(day =>
              day.future ? (
                <div key={day.iso} className="aspect-square" />
              ) : (
                <Tooltip key={day.iso} content={`${day.count} test${day.count === 1 ? '' : 's'} on ${day.label}`}>
                  <div className="aspect-square rounded-[3px]" style={LEVEL_STYLE[levelFor(day.count, max)]} />
                </Tooltip>
              )
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
