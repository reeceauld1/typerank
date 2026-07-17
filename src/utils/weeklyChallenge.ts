export const WEEKLY_TEST_TARGET = 100;
export const WEEKLY_XP_BONUS = 15000;

// Monday-start week, at local midnight.
export function getWeekStart(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 (Sun) .. 6 (Sat)
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  return d;
}

export function weekKey(date: Date = new Date()): string {
  return getWeekStart(date).toISOString().slice(0, 10);
}

// Next Monday local midnight — the same boundary getWeekStart already picks
// the challenge week on, just one week further out.
export function nextWeeklyReset(date: Date = new Date()): Date {
  const start = getWeekStart(date);
  const next = new Date(start);
  next.setDate(start.getDate() + 7);
  return next;
}
