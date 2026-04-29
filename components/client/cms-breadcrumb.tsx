import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

interface CmsBreadcrumbItem {
  label: string;
  href?: string;
}

interface CmsBreadcrumbProps {
  items: CmsBreadcrumbItem[];
}

export function CmsBreadcrumb({ items }: CmsBreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className="mb-2 flex items-center gap-1 text-xs text-muted-foreground">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <div key={`${item.label}-${index}`} className="flex items-center gap-1">
            {item.href && !isLast ? (
              <Link href={item.href} className="hover:text-foreground transition-colors duration-150">
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? 'font-semibold text-foreground' : ''}>{item.label}</span>
            )}

            {!isLast ? <ChevronRight size={12} className="text-muted-foreground/70" /> : null}
          </div>
        );
      })}
    </nav>
  );
}
