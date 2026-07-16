import type { UserStats } from '../types/index.js';
import { RANK_TIERS, PLACEMENT_GAMES } from './rank.js';
import ShineIcon from '../components/ShineIcon.js';

// Bypasses every unlock condition below — every avatar/border shows as
// unlocked for this account. Cosmetic-only, no other admin privileges.
const ADMIN_EMAILS = ['yvernxyz@gmail.com'];

export function isAdminEmail(email?: string | null): boolean {
  return Boolean(email) && ADMIN_EMAILS.includes(email!.toLowerCase());
}

export interface AvatarDef {
  id: string;
  name: string;
  description: string;
  // Shorter description shown on the challenges page, in place of
  // `description`, when the full tooltip text isn't needed there.
  challengeDescription?: string;
  icon: (props: { className?: string }) => React.ReactElement;
  isUnlocked: (stats: UserStats) => boolean;
  // 0-1 progress toward isUnlocked, for challenge-page progress bars.
  progress: (stats: UserStats) => number;
}

export interface BorderDef {
  id: string;
  name: string;
  description: string;
  className: string;
  isUnlocked: (stats: UserStats) => boolean;
  progress: (stats: UserStats) => number;
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

function ratio(current: number, target: number): number {
  return target > 0 ? Math.min(1, current / target) : 1;
}

function rankMinElo(tierId: string): number {
  return RANK_TIERS.find(t => t.id === tierId)?.min ?? 0;
}

// peakElo defaults to the same 1000 starting elo everyone has before ever
// playing a ranked match, so unlocking also requires having actually
// finished placements — otherwise Bronze/Silver would show as already
// unlocked for someone who has never queued.
function reachedRank(stats: UserStats, tierId: string): boolean {
  return stats.rankedGamesPlayed >= PLACEMENT_GAMES && stats.peakElo >= rankMinElo(tierId);
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
    progress: () => 1,
    icon: icon(
      <>
        <rect x="2.5" y="6" width="19" height="12" rx="2" />
        <path d="M6 10h.01M9.25 10h.01M12.5 10h.01M15.75 10h.01M19 10h.01M6.5 14h11" />
      </>
    ),
  },
  // --- levels ---
  {
    id: 'feather',
    name: 'Feather',
    description: 'Reach level 5.',
    isUnlocked: stats => stats.level >= 5,
    progress: stats => ratio(stats.level, 5),
    icon: icon(
      <>
        <path d="M19 5c-6 0-12 3-14 14 11-2 14-8 14-14Z" />
        <path d="M5 19 19 5" />
      </>
    ),
  },
  {
    id: 'trophy',
    name: 'Trophy',
    description: 'Reach level 10.',
    isUnlocked: stats => stats.level >= 10,
    progress: stats => ratio(stats.level, 10),
    icon: icon(
      <>
        <path d="M7 4h10v4a5 5 0 0 1-10 0V4Z" />
        <path d="M7 5H4a3 3 0 0 0 3 5M17 5h3a3 3 0 0 1-3 5" />
        <path d="M12 13v3M9 20h6M9 20c0-2 1-2 3-2s3 0 3 2" />
      </>
    ),
  },
  {
    id: 'crown',
    name: 'Crown',
    description: 'Reach level 25.',
    isUnlocked: stats => stats.level >= 25,
    progress: stats => ratio(stats.level, 25),
    icon: icon(
      <>
        <path d="M4 18h16l1-9-5 3-4-6-4 6-5-3 1 9Z" />
        <path d="M4 18h16v2H4z" fill="currentColor" stroke="none" />
      </>
    ),
  },
  {
    id: 'hourglass',
    name: 'Hourglass',
    description: 'Reach level 50.',
    isUnlocked: stats => stats.level >= 50,
    progress: stats => ratio(stats.level, 50),
    icon: icon(
      <path d="M6 3h12M6 21h12M7 3c0 5 4 6 5 9-1 3-5 4-5 9M17 3c0 5-4 6-5 9 1 3 5 4 5 9" />
    ),
  },
  // --- completing tests ---
  {
    id: 'compass',
    name: 'Compass',
    description: 'Set a personal best in all 6 modes.',
    isUnlocked: stats => allModesPlayed(stats),
    progress: stats => ratio(Object.values(stats.bestWpm).filter(wpm => wpm > 0).length, 6),
    icon: icon(
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M15 9l-2 5-5 2 2-5 5-2Z" />
      </>
    ),
  },
  {
    id: 'flame',
    name: 'Flame',
    description: 'Complete 50 tests.',
    isUnlocked: stats => stats.totalTests >= 50,
    progress: stats => ratio(stats.totalTests, 50),
    icon: icon(
      <path d="M12 3c2 3-1 4-1 7a2 2 0 0 0 4 0c0-1-.5-2-.5-2 1.5 1 2.5 3 2.5 5a5 5 0 0 1-10 0c0-4 3-5 3-8a3 3 0 0 1 2-2Z" />
    ),
  },
  {
    id: 'star',
    name: 'Star',
    description: 'Complete 100 tests.',
    isUnlocked: stats => stats.totalTests >= 100,
    progress: stats => ratio(stats.totalTests, 100),
    icon: icon(<path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.3 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8L12 2Z" />),
  },
  {
    id: 'mountain',
    name: 'Mountain',
    description: 'Complete 250 tests.',
    isUnlocked: stats => stats.totalTests >= 250,
    progress: stats => ratio(stats.totalTests, 250),
    icon: icon(
      <>
        <path d="M3 19 9 7l4 6 2-3 6 9H3Z" />
        <circle cx="17" cy="6" r="2" />
      </>
    ),
  },
  {
    id: 'anchor',
    name: 'Anchor',
    description: 'Complete 500 tests.',
    isUnlocked: stats => stats.totalTests >= 500,
    progress: stats => ratio(stats.totalTests, 500),
    icon: icon(
      <>
        <circle cx="12" cy="5" r="2" />
        <path d="M12 7v14M8 12H4a8 8 0 0 0 8 9 8 8 0 0 0 8-9h-4" />
      </>
    ),
  },
  // --- wpm ---
  {
    id: 'bolt',
    name: 'Bolt',
    description: 'Reach 60 WPM in any mode.',
    isUnlocked: stats => bestWpmOverall(stats) >= 60,
    progress: stats => ratio(bestWpmOverall(stats), 60),
    icon: icon(<path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />),
  },
  {
    id: 'rocket',
    name: 'Rocket',
    description: 'Reach 100 WPM in any mode.',
    isUnlocked: stats => bestWpmOverall(stats) >= 100,
    progress: stats => ratio(bestWpmOverall(stats), 100),
    icon: icon(
      <>
        <path d="M12 2c3 2 4 6 4 10l-4 4-4-4c0-4 1-8 4-10Z" />
        <path d="M8 14l-3 3 1 4 4-1M16 14l3 3-1 4-4-1" />
        <circle cx="12" cy="9" r="1.5" fill="currentColor" stroke="none" />
      </>
    ),
  },
  {
    id: 'diamond',
    name: 'Diamond',
    description: 'Reach 120 WPM in any mode.',
    isUnlocked: stats => bestWpmOverall(stats) >= 120,
    progress: stats => ratio(bestWpmOverall(stats), 120),
    icon: icon(
      <>
        <path d="M6 9 12 3l6 6-6 12z" />
        <path d="M6 9h12M9 9l3 12M15 9l-3 12" />
      </>
    ),
  },
  // --- keeping average accuracy ---
  {
    id: 'target',
    name: 'Target',
    description: 'Keep 95%+ average accuracy over 20 tests.',
    isUnlocked: stats => stats.totalTests >= 20 && avgAccuracy(stats) >= 95,
    progress: stats => Math.min(ratio(stats.totalTests, 20), ratio(avgAccuracy(stats), 95)),
    icon: icon(
      <>
        <circle cx="12" cy="12" r="8" />
        <circle cx="12" cy="12" r="4.5" />
        <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
      </>
    ),
  },
  {
    id: 'shield',
    name: 'Shield',
    description: 'Keep 97%+ average accuracy over 50 tests.',
    isUnlocked: stats => stats.totalTests >= 50 && avgAccuracy(stats) >= 97,
    progress: stats => Math.min(ratio(stats.totalTests, 50), ratio(avgAccuracy(stats), 97)),
    icon: icon(
      <>
        <path d="M12 3l7 3v6c0 5-3 8-7 9-4-1-7-4-7-9V6l7-3Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
  },
  {
    id: 'medal',
    name: 'Medal',
    description: 'Keep 99%+ average accuracy over 100 tests.',
    isUnlocked: stats => stats.totalTests >= 100 && avgAccuracy(stats) >= 99,
    progress: stats => Math.min(ratio(stats.totalTests, 100), ratio(avgAccuracy(stats), 99)),
    icon: icon(
      <>
        <circle cx="12" cy="15" r="6" />
        <path d="M9 10 7 3M15 10l2-7M7 3h4M17 3h-4" />
        <path d="M12 12v6" />
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
    progress: () => 1,
    className: 'border-[var(--border)]',
  },
  {
    id: 'bronze',
    name: 'Bronze',
    description: 'Reach level 5.',
    isUnlocked: stats => stats.level >= 5,
    progress: stats => ratio(stats.level, 5),
    className: 'border-[#b08d57] shadow-[0_0_2px_0px_#b08d5799]',
  },
  {
    id: 'silver',
    name: 'Silver',
    description: 'Reach level 15.',
    isUnlocked: stats => stats.level >= 15,
    progress: stats => ratio(stats.level, 15),
    className: 'border-[#c7ccd1] shadow-[0_0_4px_0px_#c7ccd199]',
  },
  {
    id: 'gold',
    name: 'Gold',
    description: 'Reach level 30.',
    isUnlocked: stats => stats.level >= 30,
    progress: stats => ratio(stats.level, 30),
    className: 'border-[#ffd24a] shadow-[0_0_6px_0px_#ffd24aaa]',
  },
  {
    id: 'platinum',
    name: 'Platinum',
    description: 'Reach level 40.',
    isUnlocked: stats => stats.level >= 40,
    progress: stats => ratio(stats.level, 40),
    className: 'border-[#7dd3fc] shadow-[0_0_8px_0px_#7dd3fcaa]',
  },
  {
    id: 'diamond',
    name: 'Diamond',
    description: 'Reach level 50.',
    isUnlocked: stats => stats.level >= 50,
    progress: stats => ratio(stats.level, 50),
    className: 'border-[#3b9ee0] shadow-[0_0_10px_0px_#3b9ee0bb]',
  },
  {
    id: 'amethyst',
    name: 'Amethyst',
    description: 'Reach level 75.',
    isUnlocked: stats => stats.level >= 75,
    progress: stats => ratio(stats.level, 75),
    className: 'border-[#9b59d0] shadow-[0_0_12px_0px_#9b59d0cc]',
  },
  {
    id: 'legend',
    name: 'Legend',
    description: 'Reach level 100.',
    isUnlocked: stats => stats.level >= 100,
    progress: stats => ratio(stats.level, 100),
    className: 'border-transparent legend-border',
  },
];

// Ranked-tier rewards are a username color (not a border — see
// NAME_COLOR_CATALOG below), gated on peakElo rather than the level-gated
// borders above.
export interface NameColorDef {
  id: string;
  name: string;
  description: string;
  // Applied directly to the rendered username text (see UsernameText.tsx).
  className: string;
  isUnlocked: (stats: UserStats) => boolean;
  progress: (stats: UserStats) => number;
}

export const NAME_COLOR_CATALOG: NameColorDef[] = [
  {
    id: 'default',
    name: 'Default',
    description: 'Everyone starts here.',
    isUnlocked: () => true,
    progress: () => 1,
    className: 'text-[var(--text-correct)]',
  },
  {
    id: 'bronze',
    name: 'Bronze',
    description: 'Reach Bronze rank.',
    isUnlocked: stats => reachedRank(stats, 'bronze'),
    progress: stats => ratio(stats.peakElo, rankMinElo('bronze')),
    className: 'text-[#b08d57]',
  },
  {
    id: 'silver',
    name: 'Silver',
    description: 'Reach Silver rank.',
    isUnlocked: stats => reachedRank(stats, 'silver'),
    progress: stats => ratio(stats.peakElo, rankMinElo('silver')),
    className: 'text-[#c7ccd1]',
  },
  {
    id: 'gold',
    name: 'Gold',
    description: 'Reach Gold rank.',
    isUnlocked: stats => reachedRank(stats, 'gold'),
    progress: stats => ratio(stats.peakElo, rankMinElo('gold')),
    className: 'text-[#ffd24a]',
  },
  {
    id: 'platinum',
    name: 'Platinum',
    description: 'Reach Platinum rank.',
    isUnlocked: stats => reachedRank(stats, 'platinum'),
    progress: stats => ratio(stats.peakElo, rankMinElo('platinum')),
    className: 'text-[#7dd3fc]',
  },
  {
    id: 'diamond',
    name: 'Diamond',
    description: 'Reach Diamond rank.',
    isUnlocked: stats => reachedRank(stats, 'diamond'),
    progress: stats => ratio(stats.peakElo, rankMinElo('diamond')),
    className: 'text-[#3b9ee0]',
  },
  {
    id: 'master',
    name: 'Master',
    description: 'Reach Master rank.',
    isUnlocked: stats => reachedRank(stats, 'master'),
    progress: stats => ratio(stats.peakElo, rankMinElo('master')),
    className: 'text-[#b967ff]',
  },
  {
    id: 'grandmaster',
    name: 'Grandmaster',
    description: 'Reach Grandmaster rank.',
    isUnlocked: stats => reachedRank(stats, 'grandmaster'),
    progress: stats => ratio(stats.peakElo, rankMinElo('grandmaster')),
    className: 'rainbow-name',
  },
];

export function getNameColor(id: string): NameColorDef {
  return NAME_COLOR_CATALOG.find(c => c.id === id) ?? NAME_COLOR_CATALOG[0];
}

export function getAvatar(id: string): AvatarDef {
  return AVATAR_CATALOG.find(a => a.id === id) ?? AVATAR_CATALOG[0];
}

// Badges: a small icon+label chip next to a username (see UsernameBadge.tsx).
// Unlike every other cosmetic here, unlock state isn't derivable purely from
// stats already on the row client-side — signup order, a real donation, and
// global top-3 rank all need server-side facts — so each is backed by its
// own persisted boolean (is_founder/is_supporter/is_fast_typer) rather than
// an isUnlocked(stats) function.
export interface BadgeDef {
  id: string;
  name: string;
  description: string;
  icon: (props: { className?: string }) => React.ReactElement;
  color: string;
  isUnlocked: (stats: UserStats) => boolean;
}

export const BADGE_CATALOG: BadgeDef[] = [
  {
    id: 'founder',
    name: 'Founder',
    description: 'One of the first 25 people to join typeladder.',
    icon: ({ className }) => (
      <ShineIcon
        className={className}
        variant="fill"
        color="#ffd24a"
        paths={<path d="M12 2.5l2.9 6.6 7.1.6-5.4 4.7 1.7 7-6.3-3.9-6.3 3.9 1.7-7-5.4-4.7 7.1-.6z" />}
      />
    ),
    color: '#ffd24a',
    isUnlocked: stats => stats.isFounder,
  },
  {
    id: 'supporter',
    name: 'Supporter',
    description: 'Supported typeladder with a Ko-fi donation.',
    // The heart's own bounding box (20 units wide, ~18.35 tall inside the
    // 24x24 viewBox) fills a larger fraction of its width than its height —
    // rendered at the same size as the other badge icons, that made it read
    // as sitting off-center horizontally. scaleX narrows it to match the
    // vertical fill ratio instead of the raw square box. The heartbeat
    // keyframes (index.css) bake that same scaleX(0.92) into every frame,
    // since a CSS animation targeting `transform` overrides the inline
    // style here rather than combining with it.
    icon: ({ className }) => (
      <svg viewBox="0 0 24 24" fill="currentColor" className={`${className ?? ''} badge-heartbeat`}>
        <path d="M12 21.35 10.55 20.03C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54Z" />
      </svg>
    ),
    color: '#ec4899',
    isUnlocked: stats => stats.isSupporter,
  },
  {
    id: 'fast_typer',
    name: 'Fast Typer',
    description: 'Top 3 globally in wpm on any test length.',
    icon: ({ className }) => (
      <ShineIcon
        className={className}
        variant="stroke"
        color="#5b9bd9"
        paths={
          <>
            <rect x="2.5" y="6" width="19" height="13" rx="2" />
            <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M6 14h12" />
          </>
        }
      />
    ),
    color: '#5b9bd9',
    isUnlocked: stats => stats.isFastTyper,
  },
  {
    id: 'dev',
    name: 'Dev',
    description: 'Built typeladder.',
    icon: ({ className }) => (
      <ShineIcon
        className={className}
        variant="fill"
        color="#b8bcc4"
        flip
        paths={<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />}
      />
    ),
    color: '#b8bcc4',
    // Hardcoded to one account (yvernxyz@gmail.com, username "yvern") —
    // username alone is enough since it's unique (case-insensitive) and
    // UserStats doesn't carry email at all.
    isUnlocked: stats => stats.username?.toLowerCase() === 'yvern',
  },
  {
    id: 'goat',
    name: 'GOAT',
    description: 'Secret. If you have it, you know why.',
    icon: ({ className }) => (
      <ShineIcon
        className={className}
        variant="fill"
        color="#9aa0ab"
        paths={
          // A single path with the eyes/nose as extra subpaths, cut out of
          // the skull via fillRule="evenodd" rather than drawn as separate
          // shapes — punches through to whatever's behind the icon instead
          // of needing to match a specific background color.
          <path
            fillRule="evenodd"
            d="M12 3c-4 0-7 3-7 7v2.5c0 1 .4 1.8 1.2 2.3.3.2.5.5.5.9v1.8c0 .6.5 1 1 .8l1.3-.5c.3-.1.6.1.6.4v1c0 .4.3.7.7.7h3.4c.4 0 .7-.3.7-.7v-1c0-.3.3-.5.6-.4l1.3.5c.5.2 1-.2 1-.8v-1.8c0-.4.2-.7.5-.9.8-.5 1.2-1.3 1.2-2.3V10c0-4-3-7-7-7z
               M10.5 11a1.5 1.5 0 1 1 -3 0 1.5 1.5 0 0 1 3 0z
               M16.5 11a1.5 1.5 0 1 1 -3 0 1.5 1.5 0 0 1 3 0z
               M12 12.5l-1 2h2z
               M11.1 18.6h.5v1.5h-.5z
               M12.6 18.6h.5v1.5h-.5z"
          />
        }
      />
    ),
    color: '#9aa0ab',
    // Granted by hand to two accounts (see schema_032) — no derivable
    // criteria, same one-off pattern as Dev, just a real is_goat column
    // instead of a username check since it isn't a single hardcoded account.
    isUnlocked: stats => stats.isGoat,
  },
];

export function getBadge(id: string): BadgeDef | null {
  return BADGE_CATALOG.find(b => b.id === id) ?? null;
}

export function getBorder(id: string): BorderDef {
  return BORDER_CATALOG.find(b => b.id === id) ?? BORDER_CATALOG[0];
}
