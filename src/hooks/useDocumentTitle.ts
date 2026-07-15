import { useEffect } from 'react';

export function useDocumentTitle(title: string): void {
  useEffect(() => {
    document.title = title ? `${title} · typeladder` : 'typeladder';
    return () => {
      document.title = 'typeladder';
    };
  }, [title]);
}
