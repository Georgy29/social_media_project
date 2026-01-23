import type { ReactNode } from "react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";

type SidebarCardProps = {
  title: string;
  children: ReactNode;
};

export function SidebarCard({ title, children }: SidebarCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <h3 className="text-sm font-semibold">{title}</h3>
      </CardHeader>
      <CardContent className="text-sm">{children}</CardContent>
    </Card>
  );
}
