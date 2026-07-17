import { getNameColor } from '../utils/cosmetics.js';

interface UsernameTextProps {
  username: string;
  colorId: string;
  className?: string;
}

export default function UsernameText({ username, colorId, className = '' }: UsernameTextProps) {
  const color = getNameColor(colorId);
  // Every unlocked tier gets the metallic shine sweep except Legend,
  // whose own rainbow animation already reads as "shiny" without it.
  const shine = colorId !== 'default' && colorId !== 'legend';
  return (
    <span
      className={`relative -top-px inline-block self-center leading-none font-bold ${color.className} ${shine ? 'name-shine' : ''} ${className}`}
      data-shine-text={shine ? username : undefined}
    >
      {username}
    </span>
  );
}
