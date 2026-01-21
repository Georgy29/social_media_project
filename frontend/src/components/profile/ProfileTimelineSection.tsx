import { useMemo, useState } from "react";

import { type PostWithCounts, PostCard } from "@/components/PostCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUserTimelineQuery } from "@/api/queries";

type ProfileTimelineSectionProps = {
  username?: string;
  meId?: number;
  onToggleLike: (post: PostWithCounts) => void;
  onToggleRetweet: (post: PostWithCounts) => void;
  onUpdate: (postId: number, content: string) => Promise<unknown>;
  onDelete: (postId: number) => Promise<void>;
  isPostMutating: (postId: number) => boolean;
};

export function ProfileTimelineSection({
  username,
  meId,
  onToggleLike,
  onToggleRetweet,
  onUpdate,
  onDelete,
  isPostMutating,
}: ProfileTimelineSectionProps) {
  const [timelineFilter, setTimelineFilter] = useState<
    "all" | "posts" | "retweets"
  >("all");
  const [timelinePage, setTimelinePage] = useState(0);
  const timelineLimit = 10;
  const timelineParams = useMemo(
    () => ({ skip: timelinePage * timelineLimit, limit: timelineLimit }),
    [timelinePage, timelineLimit],
  );
  const timelineQuery = useUserTimelineQuery(username, timelineParams);
  const isTimelineRefreshing =
    timelineQuery.isFetching && timelineQuery.isPlaceholderData;

  const filteredTimeline = useMemo(() => {
    if (!timelineQuery.data) return [];
    if (timelineFilter === "all") return timelineQuery.data;
    return timelineQuery.data.filter((item) => item.type === timelineFilter);
  }, [timelineFilter, timelineQuery.data]);

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle>Timeline</CardTitle>
          {isTimelineRefreshing ? (
            <div className="text-muted-foreground text-xs">Refreshing...</div>
          ) : null}
        </div>
        <Tabs
          value={timelineFilter}
          onValueChange={(value) =>
            setTimelineFilter(value as "all" | "posts" | "retweets")
          }
          className="pb-1"
        >
          <TabsList variant="line" className="w-full justify-start gap-2">
            <TabsTrigger value="all" className="h-10 px-4 text-sm">
              All
            </TabsTrigger>
            <TabsTrigger value="posts" className="h-10 px-4 text-sm">
              Posts
            </TabsTrigger>
            <TabsTrigger value="retweets" className="h-10 px-4 text-sm">
              Reposts
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent className="space-y-3">
        {!username ? (
          <div className="text-muted-foreground text-sm">
            Select a profile to view their posts.
          </div>
        ) : timelineQuery.isPending ? (
          <div className="flex justify-center py-10">
            <Spinner size="lg" />
          </div>
        ) : timelineQuery.isError ? (
          <div className="text-muted-foreground text-sm">
            {timelineQuery.error.message}
          </div>
        ) : timelineQuery.data.length ? (
          filteredTimeline.length ? (
            <div className="space-y-4">
              {filteredTimeline.map((item) => {
                const repostedLabel = item.reposted_at
                  ? new Date(item.reposted_at).toLocaleString()
                  : null;
                return (
                  <div
                    key={`${item.type}-${item.activity_at}-${item.post.id}`}
                    className="space-y-2"
                  >
                    {item.type === "retweets" ? (
                      <div className="text-muted-foreground flex items-center gap-2 text-xs">
                        <Badge variant="secondary">Reposted</Badge>
                        {repostedLabel ? <span>{repostedLabel}</span> : null}
                      </div>
                    ) : null}
                    <PostCard
                      post={item.post}
                      pending={isPostMutating(item.post.id)}
                      isOwner={meId === item.post.owner_id}
                      onToggleLike={onToggleLike}
                      onToggleRetweet={onToggleRetweet}
                      onUpdate={onUpdate}
                      onDelete={onDelete}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-muted-foreground text-sm">
              No activity matches this filter.
            </div>
          )
        ) : (
          <div className="text-muted-foreground text-sm">No activity yet.</div>
        )}
      </CardContent>
      <CardFooter className="justify-between">
        <Button
          variant="outline"
          size="sm"
          disabled={timelinePage === 0 || timelineQuery.isFetching}
          onClick={() => setTimelinePage((value) => Math.max(0, value - 1))}
        >
          Previous
        </Button>
        <div className="text-muted-foreground text-xs">
          Page {timelinePage + 1}
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={
            timelineQuery.isFetching ||
            (timelineQuery.data?.length ?? 0) < timelineLimit
          }
          onClick={() => setTimelinePage((value) => value + 1)}
        >
          Next
        </Button>
      </CardFooter>
    </Card>
  );
}
