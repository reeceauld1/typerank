export const WEEKLY_TEST_TARGET = 100;
export const WEEKLY_XP_BONUS = 10000;

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
