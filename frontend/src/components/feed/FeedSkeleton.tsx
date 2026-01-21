import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function FeedSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={index} className="animate-pulse">
          <CardHeader className="space-y-2">
            <div className="bg-muted h-4 w-32 rounded" />
            <div className="bg-muted h-3 w-24 rounded" />
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="bg-muted h-3 w-full rounded" />
            <div className="bg-muted h-3 w-5/6 rounded" />
            <div className="mt-4 flex gap-2">
              <div className="bg-muted h-8 w-20 rounded" />
              <div className="bg-muted h-8 w-20 rounded" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
