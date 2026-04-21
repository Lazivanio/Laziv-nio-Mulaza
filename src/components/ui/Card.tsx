import { ReactNode } from 'react';
import { cn } from '../../lib/utils';

export const Card = ({ children, className, ...props }: { children: ReactNode, className?: string, [key: string]: any }) => (
  <div className={cn("bg-white border border-zinc-100 rounded-3xl overflow-hidden shadow-sm", className)} {...props}>
    {children}
  </div>
);
