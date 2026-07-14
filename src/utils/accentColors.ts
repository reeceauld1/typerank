import type { UserStats } from '../types/index.js';

export interface AccentColorDef {
  id: string;
  name: string;
  description: string;
  hex: string; // ignored when id === 'custom' — the user's own chosen hex is used instead
  isUnlocked: (stats: UserStats) => boolean;
}

export const ACCENT_COLOR_CATALOG: AccentColorDef[] = [
  { id: 'blue', name: 'Blue', description: 'Everyone starts here.', hex: '#5b9bd9', isUnlocked: () => true },
  {
    id: 'teal',
    name: 'Teal',
    description: 'Type for 15 minutes total.',
    hex: '#4fb8a8',
    isUnlocked: stats => stats.totalTimeTyped >= 900,
  },
  {
    id: 'green',
    name: 'Green',
    description: 'Type for 30 minutes total.',
    hex: '#5bc16f',
    isUnlocked: stats => stats.totalTimeTyped >= 1800,
  },
  {
    id: 'purple',
    name: 'Purple',
    description: 'Type for 1 hour total.',
    hex: '#a55bd9',
    isUnlocked: stats => stats.totalTimeTyped >= 3600,
  },
  {
    id: 'orange',
    name: 'Orange',
    description: 'Type for 2 hours total.',
    hex: '#e0913f',
    isUnlocked: stats => stats.totalTimeTyped >= 7200,
  },
  {
    id: 'magenta',
    name: 'Magenta',
    description: 'Type for 4 hours total.',
    hex: '#d1477a',
    isUnlocked: stats => stats.totalTimeTyped >= 14400,
  },
  {
    id: 'gold',
    name: 'Gold',
    description: 'Type for 8 hours total.',
    hex: '#d9b23f',
    isUnlocked: stats => stats.totalTimeTyped >= 28800,
  },
  {
    id: 'custom',
    name: 'Custom',
    description: 'Type for 16 hours total — pick any color.',
    hex: '#5b9bd9',
    isUnlocked: stats => stats.totalTimeTyped >= 57600,
  },
];

export function getAccentColor(id: string): AccentColorDef {
  return ACCENT_COLOR_CATALOG.find(c => c.id === id) ?? ACCENT_COLOR_CATALOG[0];
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
