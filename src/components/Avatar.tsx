import { getAvatar, getBorder } from '../utils/cosmetics.js';

interface AvatarProps {
  avatarId: string;
  borderId: string;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_CLASSES: Record<NonNullable<AvatarProps['size']>, string> = {
  sm: 'w-10 h-10',
  md: 'w-14 h-14',
  lg: 'w-20 h-20',
};

const ICON_SIZE_CLASSES: Record<NonNullable<AvatarProps['size']>, string> = {
  sm: 'w-5 h-5',
  md: 'w-7 h-7',
  lg: 'w-10 h-10',
};

export default function Avatar({ avatarId, borderId, size = 'md' }: AvatarProps) {
  const avatar = getAvatar(avatarId);
  const border = getBorder(borderId);
  const Icon = avatar.icon;

  // Legend's glow lives on this wrapper, not the circle itself — a
  // pseudo-element's negative z-index only controls paint order among its
  // host's *children*; the host's own opaque background still paints
  // before it. Putting the glow on an outer, background-less wrapper lets
  // the circle's opaque fill (an ordinary child of the wrapper) mask the
  // inward half of the blur, so it only shows outside the circle.
  return (
    <div className={`relative shrink-0 rounded-full ${border.id === 'legend' ? 'legend-glow-wrapper' : ''}`}>
      <div
        className={`${SIZE_CLASSES[size]} border-2 rounded-full flex items-center justify-center bg-[var(--bg-elevated)] text-[var(--text-correct)] ${border.className}`}
      >
        <Icon className={ICON_SIZE_CLASSES[size]} />
      </div>
    </div>
  );
}
