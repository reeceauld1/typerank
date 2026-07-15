import { useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import type { ReactNode, MouseEvent } from 'react';

interface TooltipProps {
  content: string;
  children: ReactNode;
  className?: string;
}

export default function Tooltip({ content, children, className = '' }: TooltipProps) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    setPos({ x: e.clientX, y: e.clientY });
  };

  return (
    <div className={className} onMouseMove={handleMouseMove} onMouseLeave={() => setPos(null)}>
      {children}
      {createPortal(
        <AnimatePresence>
          {pos && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed z-50 pointer-events-none px-2.5 py-1.5 rounded-md bg-[var(--bg-elevated)] border border-[var(--border)] text-xs text-[var(--text-secondary)] max-w-[220px] shadow-lg"
              style={{ left: pos.x + 14, top: pos.y + 14 }}
            >
              {content}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
