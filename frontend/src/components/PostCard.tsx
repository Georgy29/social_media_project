import type { components } from "@/api/types"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"

export type PostWithCounts = components["schemas"]["PostWithCounts"]

export function PostCard({
  post,
  onToggleLike,
  onToggleRetweet,
  pending = false,
}: {
  post: PostWithCounts
  pending?: boolean
  onToggleLike: (post: PostWithCounts) => void
  onToggleRetweet: (post: PostWithCounts) => void
}) {
  const ts = new Date(post.timestamp)
  const timeLabel = Number.isNaN(ts.valueOf()) ? post.timestamp : ts.toLocaleString()

  return (
    <Card>
      <CardHeader className="space-y-1">
        <div className="flex items-baseline justify-between gap-2">
          <div className="font-medium">@{post.owner_username}</div>
          <div className="text-muted-foreground text-xs">{timeLabel}</div>
        </div>
      </CardHeader>
      <CardContent className="whitespace-pre-wrap">{post.content}</CardContent>
      <CardFooter className="gap-2">
        <Button
          variant={post.is_liked ? "default" : "outline"}
          size="sm"
          disabled={pending}
          onClick={() => onToggleLike(post)}
        >
          {post.is_liked ? "Liked" : "Like"} ({post.likes_count})
        </Button>
        <Button
          variant={post.is_retweeted ? "default" : "outline"}
          size="sm"
          disabled={pending}
          onClick={() => onToggleRetweet(post)}
        >
          {post.is_retweeted ? "Reposted" : "Repost"} ({post.retweets_count})
        </Button>
      </CardFooter>
    </Card>
  )
}

