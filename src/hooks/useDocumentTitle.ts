import { useEffect } from 'react';

// `description` overrides the root <meta name="description"> for as long as
// this page is mounted, then restores whatever was there before (index.html's
// site-wide default, or another page's description if this one somehow
// mounted inside another) — captured fresh on each mount rather than
// hardcoded, so it always restores the exact prior value.
export function useDocumentTitle(title: string, description?: string): void {
  useEffect(() => {
    document.title = title ? `${title} · typeladder` : 'typeladder';

    const meta = document.querySelector('meta[name="description"]');
    const prevDescription = meta?.getAttribute('content') ?? null;
    if (description && meta) meta.setAttribute('content', description);

    return () => {
      document.title = 'typeladder';
      if (description && meta && prevDescription !== null) meta.setAttribute('content', prevDescription);
    };
  }, [title, description]);
}
