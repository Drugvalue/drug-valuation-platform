import * as React from 'react';

export function Card({ className = '', children }: React.PropsWithChildren<{ className?: string }>) {
  return <div className={`rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-neutral-900 ${className}`}>{children}</div>;
}
export function CardHeader({ className = '', children }: React.PropsWithChildren<{ className?: string }>) {
  return <div className={`px-4 pt-4 ${className}`}>{children}</div>;
}
export function CardContent({ className = '', children }: React.PropsWithChildren<{ className?: string }>) {
  return <div className={`px-4 pb-4 ${className}`}>{children}</div>;
}
