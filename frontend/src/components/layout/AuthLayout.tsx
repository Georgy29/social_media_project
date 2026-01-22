import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type AuthLayoutProps = {
  children: ReactNode;
  contentClassName?: string;
};

export function AuthLayout({ children, contentClassName }: AuthLayoutProps) {
  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className={cn("w-full", contentClassName)}>{children}</div>
    </div>
  );
}
