import type { CSSProperties } from 'react';
import bronzeSvg from '../assets/rankIcons/bronzeIcon.svg?raw';
import silverSvg from '../assets/rankIcons/silverIcon.svg?raw';
import goldSvg from '../assets/rankIcons/goldIcon.svg?raw';
import platinumSvg from '../assets/rankIcons/platinumIcon.svg?raw';
import diamondSvg from '../assets/rankIcons/diamondIcon.svg?raw';
import amethystSvg from '../assets/rankIcons/amethystIcon.svg?raw';
import legendSvg from '../assets/rankIcons/legendIcon.svg?raw';

const ICON_SVG: Record<string, string> = {
  bronze: bronzeSvg,
  silver: silverSvg,
  gold: goldSvg,
  platinum: platinumSvg,
  diamond: diamondSvg,
  amethyst: amethystSvg,
  legend: legendSvg,
};

// CSS mask-image, not an <img src>, is what makes this recolorable/
// animatable at all: an <img> just paints the SVG's own (black) fill with
// no way for our CSS to reach inside it, but a mask only cares about the
// icon's silhouette (its painted-vs-transparent shape) and lets whatever
// paints *behind* the mask - a solid tier color, or the same shine/rainbow
// treatment the tier's username color already gets - show through instead.
function maskUrl(svg: string): string {
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

const ICON_MASK: Record<string, string> = Object.fromEntries(Object.entries(ICON_SVG).map(([tier, svg]) => [tier, maskUrl(svg)]));

interface RankIconProps {
  tierId: string;
  color: string;
  className?: string;
}

// Same animation family as TierLabel's name-shine/rainbow-name text and
// RankBadge's old plain dot (see rank-dot-shine/rank-dot-legend in
// index.css) - just masked to this icon's actual silhouette instead of a
// circle, so a tier's badge previews the exact treatment its username gets.
export default function RankIcon({ tierId, color, className = '' }: RankIconProps) {
  const isLegend = tierId === 'legend';
  const mask = ICON_MASK[tierId];
  if (!mask) return null;

  const style = {
    '--rank-icon-mask': mask,
    ...(isLegend ? undefined : { backgroundColor: color }),
  } as CSSProperties;

  return <span aria-hidden="true" className={`inline-block shrink-0 rank-icon ${isLegend ? 'rank-icon-legend' : 'rank-icon-shine'} ${className}`} style={style} />;
}
