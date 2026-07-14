import type { UserStats } from '../types/index.js';

export interface AccentColorDef {
  id: string;
  name: string;
  description: string;
  // Shorter description shown on the challenges page, in place of
  // `description`, when the full tooltip text isn't needed there.
  challengeDescription?: string;
  // Ignored when id === 'custom' (the user's own chosen hex is used instead)
  // or id === 'monochrome' (resolved in CSS by theme instead — see index.css
  // and isMonochromeAccent below).
  hex: string;
  isUnlocked: (stats: UserStats) => boolean;
  progress: (stats: UserStats) => number;
}

function ratio(current: number, target: number): number {
  return target > 0 ? Math.min(1, current / target) : 1;
}

export const ACCENT_COLOR_CATALOG: AccentColorDef[] = [
  { id: 'blue', name: 'Blue', description: 'Everyone starts here.', hex: '#5b9bd9', isUnlocked: () => true, progress: () => 1 },
  {
    id: 'monochrome',
    name: 'Monochrome',
    description: 'Type for 15 minutes total. Adapts to your theme: white on dark, black on light.',
    challengeDescription: 'Type for 15 minutes total.',
    hex: '#888888',
    isUnlocked: stats => stats.totalTimeTyped >= 900,
    progress: stats => ratio(stats.totalTimeTyped, 900),
  },
  {
    id: 'green',
    name: 'Green',
    description: 'Type for 30 minutes total.',
    hex: '#5bc16f',
    isUnlocked: stats => stats.totalTimeTyped >= 1800,
    progress: stats => ratio(stats.totalTimeTyped, 1800),
  },
  {
    id: 'purple',
    name: 'Purple',
    description: 'Type for 1 hour total.',
    hex: '#a55bd9',
    isUnlocked: stats => stats.totalTimeTyped >= 3600,
    progress: stats => ratio(stats.totalTimeTyped, 3600),
  },
  {
    id: 'orange',
    name: 'Orange',
    description: 'Type for 2 hours total.',
    hex: '#e0913f',
    isUnlocked: stats => stats.totalTimeTyped >= 7200,
    progress: stats => ratio(stats.totalTimeTyped, 7200),
  },
  {
    id: 'magenta',
    name: 'Magenta',
    description: 'Type for 4 hours total.',
    hex: '#d1477a',
    isUnlocked: stats => stats.totalTimeTyped >= 14400,
    progress: stats => ratio(stats.totalTimeTyped, 14400),
  },
  {
    id: 'gold',
    name: 'Gold',
    description: 'Type for 8 hours total.',
    hex: '#d9b23f',
    isUnlocked: stats => stats.totalTimeTyped >= 28800,
    progress: stats => ratio(stats.totalTimeTyped, 28800),
  },
  {
    id: 'custom',
    name: 'Custom',
    description: 'Type for 16 hours total — pick any color.',
    challengeDescription: 'Type for 16 hours total.',
    hex: '#5b9bd9',
    isUnlocked: stats => stats.totalTimeTyped >= 57600,
    progress: stats => ratio(stats.totalTimeTyped, 57600),
  },
];

export function getAccentColor(id: string): AccentColorDef {
  return ACCENT_COLOR_CATALOG.find(c => c.id === id) ?? ACCENT_COLOR_CATALOG[0];
}

// Monochrome has no fixed hex — it's resolved by index.css's
// [data-accent-mono='true'] rules, which key off the current [data-theme]
// the same way the base --accent value already does.
export function isMonochromeAccent(id: string): boolean {
  return id === 'monochrome';
}

export function resolveAccentHex(stats: Pick<UserStats, 'equippedAccentColor' | 'customAccentHex'>): string {
  if (stats.equippedAccentColor === 'custom' && stats.customAccentHex) return stats.customAccentHex;
  return getAccentColor(stats.equippedAccentColor).hex;
}

export function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
