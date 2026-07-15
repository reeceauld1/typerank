import { getBadge } from '../utils/cosmetics.js';
import Tooltip from './Tooltip.js';

interface UsernameBadgeProps {
  badgeId: string | null | undefined;
  className?: string;
  // The interactive equip slot on the profile page shows the icon in a
  // circular swatch (matching the avatar/border slots next to it); every
  // other read-only spot a badge shows (friends, leaderboard, duels,
  // ranked, public profile) is just the bare icon.
  circle?: boolean;
}

export default function UsernameBadge({ badgeId, className = '', circle = false }: UsernameBadgeProps) {
  const badge = badgeId ? getBadge(badgeId) : null;
  if (!badge) return null;
  const Icon = badge.icon;
  return (
    <Tooltip content={`${badge.name} — ${badge.description}`} className="inline-flex self-center shrink-0">
      <span
        className={`inline-flex items-center justify-center ${
          circle ? 'w-[30px] h-[30px] rounded-full bg-[var(--bg-elevated)] border border-[var(--border)]' : ''
        } ${className}`}
        style={{ color: badge.color }}
      >
        <Icon className={circle ? 'w-[18px] h-[18px]' : 'w-4 h-4'} />
      </span>
    </Tooltip>
  );
}
