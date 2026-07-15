import { useId } from 'react';

interface ShineIconProps {
  className?: string;
  paths: React.ReactNode;
  color: string;
  variant?: 'fill' | 'stroke';
  flip?: boolean;
}

// A moving highlight swept across an icon's own silhouette (native SVG
// gradient + mask + blur, not a CSS trick) — used for the shiny badge icons
// (founder, fast typer, dev). The base icon renders solid/opaque as normal;
// a second copy of the same `paths`, masked to the icon's exact shape and
// filled with an animated soft-edged white gradient, sits on top as the
// "shine" so the sweep never spills past the icon's own outline. Needs a
// real named component (not an inline arrow like the plain badge icons)
// since it calls useId() directly, which only components/hooks may do —
// keeps the generated ids collision-free if a badge renders more than once
// on the same page. Colons stripped since raw useId() colons in url(#id)
// references have been flaky in Safari.
export default function ShineIcon({ className, paths, color, variant = 'fill', flip = false }: ShineIconProps) {
  const rawId = useId().replace(/:/g, '');
  const gradientId = `shine-grad-${rawId}`;
  const maskId = `shine-mask-${rawId}`;
  const blurId = `shine-blur-${rawId}`;
  const strokeProps = variant === 'stroke'
    ? { strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
    : {};
  // Sweeps left-to-right on screen; reversed in local space when `flip` is
  // set, since the scaleX(-1) transform below mirrors the sweep direction
  // along with everything else.
  const [x1From, x1To] = flip ? ['150%', '-150%'] : ['-150%', '150%'];
  const [x2From, x2To] = flip ? ['250%', '-50%'] : ['-50%', '250%'];

  return (
    <svg viewBox="0 0 24 24" className={className} style={flip ? { transform: 'scaleX(-1)' } : undefined}>
      <defs>
        <linearGradient id={gradientId} x1={x1From} y1="0" x2={x2From} y2="0">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          <animate attributeName="x1" values={`${x1From};${x1To}`} dur="2.5s" repeatCount="indefinite" />
          <animate attributeName="x2" values={`${x2From};${x2To}`} dur="2.5s" repeatCount="indefinite" />
        </linearGradient>
        <mask id={maskId}>
          <g fill={variant === 'fill' ? 'white' : 'none'} stroke={variant === 'stroke' ? 'white' : 'none'} {...strokeProps}>
            {paths}
          </g>
        </mask>
        <filter id={blurId} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="0.7" />
        </filter>
      </defs>
      <g fill={variant === 'fill' ? color : 'none'} stroke={variant === 'stroke' ? color : 'none'} {...strokeProps}>
        {paths}
      </g>
      <g mask={`url(#${maskId})`} filter={`url(#${blurId})`} opacity="0.8">
        <rect x="-4" y="-4" width="32" height="32" fill={`url(#${gradientId})`} />
      </g>
    </svg>
  );
}
