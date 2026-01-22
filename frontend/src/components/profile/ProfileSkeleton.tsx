import { Card, CardContent } from "@/components/ui/card";

export function ProfileSkeleton() {
  return (
    <Card className="animate-pulse">
      <div className="bg-muted h-40 w-full sm:h-48" />
      <CardContent className="space-y-4 py-6">
        <div className="flex items-end gap-3">
          <div className="bg-muted h-20 w-20 rounded-full" />
          <div className="space-y-2">
            <div className="bg-muted h-4 w-32 rounded" />
            <div className="bg-muted h-3 w-24 rounded" />
            <div className="bg-muted h-3 w-40 rounded" />
          </div>
        </div>
        <div className="flex gap-4">
          <div className="bg-muted h-3 w-20 rounded" />
          <div className="bg-muted h-3 w-20 rounded" />
          <div className="bg-muted h-3 w-20 rounded" />
        </div>
      </CardContent>
    </Card>
  );
}
