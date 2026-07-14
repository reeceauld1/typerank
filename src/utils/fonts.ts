export interface FontOption {
  id: string;
  label: string;
  // Just the specific family name (plus its own fallback where it needs
  // one), quoted — the generic fallback stack in index.css's body rule
  // applies regardless of choice.
  family: string;
}

// IBM Plex Mono stays first/default (the site's existing look), followed by
// eight of the most popular general-purpose Google Fonts, loaded via the
// link in index.html. Comic Sans MS closes out the list as the joke option —
// it's a system font (Microsoft's, not Google's), so nothing to load for it.
export const FONT_OPTIONS: FontOption[] = [
  { id: 'ibm-plex-mono', label: 'IBM Plex Mono', family: "'IBM Plex Mono'" },
  { id: 'roboto', label: 'Roboto', family: "'Roboto'" },
  { id: 'open-sans', label: 'Open Sans', family: "'Open Sans'" },
  { id: 'lato', label: 'Lato', family: "'Lato'" },
  { id: 'montserrat', label: 'Montserrat', family: "'Montserrat'" },
  { id: 'poppins', label: 'Poppins', family: "'Poppins'" },
  { id: 'inter', label: 'Inter', family: "'Inter'" },
  { id: 'source-sans-3', label: 'Source Sans 3', family: "'Source Sans 3'" },
  { id: 'nunito', label: 'Nunito', family: "'Nunito'" },
  { id: 'comic-sans', label: 'Comic Sans MS', family: "'Comic Sans MS', 'Comic Sans', cursive" },
];

export function getFont(id: string): FontOption {
  return FONT_OPTIONS.find(f => f.id === id) ?? FONT_OPTIONS[0];
}
