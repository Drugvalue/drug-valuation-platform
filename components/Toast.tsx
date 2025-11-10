import { useEffect, useState } from 'react';

export type ToastKind = 'info' | 'success' | 'error';

export function Toast({ message, kind = 'info', duration = 4000 }: { message: string; kind?: ToastKind; duration?: number }) {
  const [open, setOpen] = useState(true);
  useEffect(() => {
    const id = setTimeout(() => setOpen(false), duration);
    return () => clearTimeout(id);
  }, [duration]);
  if (!open) return null;

  const styles: Record<ToastKind, { bg: string; color: string; border: string }> = {
    success: { bg: '#e6ffed', color: '#03543f', border: '#c6f6d5' },
    error:   { bg: '#ffe6e6', color: '#981b1b', border: '#fed7d7' },
    info:    { bg: '#eef2ff', color: '#3730a3', border: '#c7d2fe' },
  };
  const s = styles[kind];

  return (
    <div style={{ position: 'relative', background: s.bg, color: s.color, padding: '0.6rem 0.8rem',
                  borderRadius: 8, border: `1px solid ${s.border}`, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      {message}
    </div>
  );
}
