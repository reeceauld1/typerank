import type { UserStats } from '../types/index.js';

export interface AvatarDef {
  id: string;
  name: string;
  description: string;
  icon: (props: { className?: string }) => React.ReactElement;
  isUnlocked: (stats: UserStats) => boolean;
}

export interface BorderDef {
  id: string;
  name: string;
  description: string;
  className: string;
  isUnlocked: (stats: UserStats) => boolean;
}

function avgAccuracy(stats: UserStats): number {
  return stats.totalTests > 0 ? stats.totalAccuracySum / stats.totalTests : 0;
}

function bestWpmOverall(stats: UserStats): number {
  return Math.max(...Object.values(stats.bestWpm));
}

function allModesPlayed(stats: UserStats): boolean {
  return Object.values(stats.bestWpm).every(wpm => wpm > 0);
}

function icon(paths: React.ReactElement) {
  return ({ className }: { className?: string }) => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {paths}
    </svg>
  );
}

export const AVATAR_CATALOG: AvatarDef[] = [
  {
    id: 'keyboard',
    name: 'Keyboard',
    description: 'Everyone starts here.',
    isUnlocked: () => true,
    icon: icon(
      <>
        <rect x="2.5" y="6" width="19" height="12" rx="2" />
        <path d="M6 10h.01M9.25 10h.01M12.5 10h.01M15.75 10h.01M19 10h.01M6.5 14h11" />
      </>
    ),
  },
  {
    id: 'feather',
    name: 'Feather',
    description: 'Reach level 5.',
    isUnlocked: stats => stats.level >= 5,
    icon: icon(
      <>
        <path d="M19 5c-6 0-12 3-14 14 11-2 14-8 14-14Z" />
        <path d="M5 19 19 5" />
      </>
    ),
  },
  {
    id: 'bolt',
    name: 'Bolt',
    description: 'Reach 60 WPM in any mode.',
    isUnlocked: stats => bestWpmOverall(stats) >= 60,
    icon: icon(<path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />),
  },
  {
    id: 'target',
    name: 'Target',
    description: 'Keep 95%+ average accuracy over 20+ tests.',
    isUnlocked: stats => stats.totalTests >= 20 && avgAccuracy(stats) >= 95,
    icon: icon(
      <>
        <circle cx="12" cy="12" r="8" />
        <circle cx="12" cy="12" r="4.5" />
        <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
      </>
    ),
  },
  {
    id: 'flame',
    name: 'Flame',
    description: 'Complete 50 tests.',
    isUnlocked: stats => stats.totalTests >= 50,
    icon: icon(
      <path d="M12 3c2 3-1 4-1 7a2 2 0 0 0 4 0c0-1-.5-2-.5-2 1.5 1 2.5 3 2.5 5a5 5 0 0 1-10 0c0-4 3-5 3-8a3 3 0 0 1 2-2Z" />
    ),
  },
  {
    id: 'trophy',
    name: 'Trophy',
    description: 'Reach level 10.',
    isUnlocked: stats => stats.level >= 10,
    icon: icon(
      <>
        <path d="M7 4h10v4a5 5 0 0 1-10 0V4Z" />
        <path d="M7 5H4a3 3 0 0 0 3 5M17 5h3a3 3 0 0 1-3 5" />
        <path d="M12 13v3M9 20h6M9 20c0-2 1-2 3-2s3 0 3 2" />
      </>
    ),
  },
  {
    id: 'compass',
    name: 'Compass',
    description: 'Set a personal best in all 6 modes.',
    isUnlocked: stats => allModesPlayed(stats),
    icon: icon(
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M15 9l-2 5-5 2 2-5 5-2Z" />
      </>
    ),
  },
  {
    id: 'star',
    name: 'Star',
    description: 'Complete 100 tests.',
    isUnlocked: stats => stats.totalTests >= 100,
    icon: icon(<path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.3 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8L12 2Z" />),
  },
  {
    id: 'shield',
    name: 'Shield',
    description: 'Keep 97%+ average accuracy over 50+ tests.',
    isUnlocked: stats => stats.totalTests >= 50 && avgAccuracy(stats) >= 97,
    icon: icon(
      <>
        <path d="M12 3l7 3v6c0 5-3 8-7 9-4-1-7-4-7-9V6l7-3Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
  },
  {
    id: 'crown',
    name: 'Crown',
    description: 'Reach level 25.',
    isUnlocked: stats => stats.level >= 25,
    icon: icon(
      <>
        <path d="M4 18h16l1-9-5 3-4-6-4 6-5-3 1 9Z" />
        <path d="M4 18h16v2H4z" fill="currentColor" stroke="none" />
      </>
    ),
  },
  {
    id: 'rocket',
    name: 'Rocket',
    description: 'Reach 100 WPM in any mode.',
    isUnlocked: stats => bestWpmOverall(stats) >= 100,
    icon: icon(
      <>
        <path d="M12 2c3 2 4 6 4 10l-4 4-4-4c0-4 1-8 4-10Z" />
        <path d="M8 14l-3 3 1 4 4-1M16 14l3 3-1 4-4-1" />
        <circle cx="12" cy="9" r="1.5" fill="currentColor" stroke="none" />
      </>
    ),
  },
  {
    id: 'mountain',
    name: 'Mountain',
    description: 'Complete 250 tests.',
    isUnlocked: stats => stats.totalTests >= 250,
    icon: icon(
      <>
        <path d="M3 19 9 7l4 6 2-3 6 9H3Z" />
        <circle cx="17" cy="6" r="2" />
      </>
    ),
  },
  {
    id: 'hourglass',
    name: 'Hourglass',
    description: 'Reach level 50.',
    isUnlocked: stats => stats.level >= 50,
    icon: icon(
      <path d="M6 3h12M6 21h12M7 3c0 5 4 6 5 9-1 3-5 4-5 9M17 3c0 5-4 6-5 9 1 3 5 4 5 9" />
    ),
  },
  {
    id: 'medal',
    name: 'Medal',
    description: 'Keep 99%+ average accuracy over 100+ tests.',
    isUnlocked: stats => stats.totalTests >= 100 && avgAccuracy(stats) >= 99,
    icon: icon(
      <>
        <circle cx="12" cy="15" r="6" />
        <path d="M9 10 7 3M15 10l2-7M7 3h4M17 3h-4" />
        <path d="M12 12v6" />
      </>
    ),
  },
  {
    id: 'diamond',
    name: 'Diamond',
    description: 'Reach 120 WPM in any mode.',
    isUnlocked: stats => bestWpmOverall(stats) >= 120,
    icon: icon(
      <>
        <path d="M6 9 12 3l6 6-6 12z" />
        <path d="M6 9h12M9 9l3 12M15 9l-3 12" />
      </>
    ),
  },
  {
    id: 'anchor',
    name: 'Anchor',
    description: 'Complete 500 tests.',
    isUnlocked: stats => stats.totalTests >= 500,
    icon: icon(
      <>
        <circle cx="12" cy="5" r="2" />
        <path d="M12 7v14M8 12H4a8 8 0 0 0 8 9 8 8 0 0 0 8-9h-4" />
      </>
    ),
  },
];

export const BORDER_CATALOG: BorderDef[] = [
  {
    id: 'none',
    name: 'None',
    description: 'Everyone starts here.',
    isUnlocked: () => true,
    className: 'border-[var(--border)]',
  },
  {
    id: 'bronze',
    name: 'Bronze',
    description: 'Reach level 5.',
    isUnlocked: stats => stats.level >= 5,
    className: 'border-[#b08d57] shadow-[0_0_10px_-2px_#b08d5799]',
  },
  {
    id: 'silver',
    name: 'Silver',
    description: 'Reach level 15.',
    isUnlocked: stats => stats.level >= 15,
    className: 'border-[#c7ccd1] shadow-[0_0_10px_-2px_#c7ccd199]',
  },
  {
    id: 'gold',
    name: 'Gold',
    description: 'Reach level 30.',
    isUnlocked: stats => stats.level >= 30,
    className: 'border-[#ffd24a] shadow-[0_0_12px_-1px_#ffd24aaa]',
  },
  {
    id: 'diamond',
    name: 'Diamond',
    description: 'Reach level 50.',
    isUnlocked: stats => stats.level >= 50,
    className: 'border-[#7dd3fc] shadow-[0_0_14px_-1px_#7dd3fcbb]',
  },
  {
    id: 'legend',
    name: 'Legend',
    description: 'Reach 140 WPM in any mode.',
    isUnlocked: stats => bestWpmOverall(stats) >= 140,
    className: 'border-transparent legend-border',
  },
];

export function getAvatar(id: string): AvatarDef {
  return AVATAR_CATALOG.find(a => a.id === id) ?? AVATAR_CATALOG[0];
}

export function getBorder(id: string): BorderDef {
  return BORDER_CATALOG.find(b => b.id === id) ?? BORDER_CATALOG[0];
}
