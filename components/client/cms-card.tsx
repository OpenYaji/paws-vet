import { cn } from '@/lib/utils';

interface CmsCardProps {
  children: React.ReactNode;
  className?: string;
  elevated?: boolean;
}

export function CmsCard({ children, className, elevated = false }: CmsCardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-border/80 bg-card/95 shadow-sm',
        elevated && 'shadow-md',
        className
      )}
    >
      {children}
    </div>
  );
}
