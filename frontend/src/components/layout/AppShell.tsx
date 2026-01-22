import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type AppShellProps = {
  sidebar: ReactNode;
  rightRail: ReactNode;
  children: ReactNode;
  mainClassName?: string;
};

export function AppShell({
  sidebar,
  rightRail,
  children,
  mainClassName,
}: AppShellProps) {
  return (
    <div className="bg-background text-foreground min-h-screen w-full">
      <div className="mx-auto grid w-full max-w-6xl gap-6 p-4 md:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,1fr)_240px]">
        <aside className="md:sticky md:top-4 md:h-[calc(100vh-2rem)]">
          <div className="hidden md:flex h-full flex-col gap-4">{sidebar}</div>
        </aside>

        <main className={cn("space-y-4", mainClassName)}>{children}</main>

        <aside className="xl:sticky xl:top-4 xl:h-[calc(100vh-2rem)] hidden xl:block">
          <div className="flex flex-col gap-4">{rightRail}</div>
        </aside>
      </div>
    </div>
  );
}
