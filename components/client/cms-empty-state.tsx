import { LucideIcon } from 'lucide-react';

interface CmsEmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export function CmsEmptyState({ icon: Icon, title, description }: CmsEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
        <Icon size={28} />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
