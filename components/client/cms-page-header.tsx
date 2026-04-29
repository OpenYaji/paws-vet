import { cn } from '@/lib/utils';

interface CmsPageHeaderProps {
  title: string;
  description?: string;
  count?: number;
  className?: string;
  actions?: React.ReactNode;
}

export function CmsPageHeader({ title, description, count, className, actions }: CmsPageHeaderProps) {
  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div>
        <div className="flex items-center gap-3">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-primary" />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
          {typeof count === 'number' && (
            <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              {count}
            </span>
          )}
        </div>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}
