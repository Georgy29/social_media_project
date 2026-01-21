import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  leading?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export function PageHeader({
  title,
  subtitle,
  leading,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-3", className)}>
      <div className={subtitle ? "space-y-1" : ""}>
        {leading ? (
          <div className="flex items-center gap-2">
            {leading}
            <div className="text-xl font-semibold">{title}</div>
          </div>
        ) : (
          <div className="text-xl font-semibold">{title}</div>
        )}
        {subtitle ? (
          <div className="text-muted-foreground text-sm">{subtitle}</div>
        ) : null}
      </div>
      {actions ? (
        <div className="flex items-center gap-2 md:hidden">{actions}</div>
      ) : null}
    </div>
  );
}
