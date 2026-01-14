import { useState } from "react"
import { IconHeart, IconHeartFilled, IconRepeat } from "@tabler/icons-react"

import type { components } from "@/api/types"

import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export type PostWithCounts = components["schemas"]["PostWithCounts"]

export function PostCard({
  post,
  onToggleLike,
  onToggleRetweet,
  onDelete,
  onUpdate,
  isOwner = false,
  pending = false,
}: {
  post: PostWithCounts
  pending?: boolean
  isOwner?: boolean
  onToggleLike: (post: PostWithCounts) => void
  onToggleRetweet: (post: PostWithCounts) => void
  onDelete?: (postId: number) => Promise<void>
  onUpdate?: (postId: number, content: string) => Promise<unknown>
}) {
  const ts = new Date(post.timestamp)
  const timeLabel = Number.isNaN(ts.valueOf()) ? post.timestamp : ts.toLocaleString()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(post.content)
  const [error, setError] = useState<string | null>(null)
  const [likeBurst, setLikeBurst] = useState(0)
  const avatarLabel = (post.owner_username || "?").slice(0, 2).toUpperCase()

  const handleToggleLike = () => {
    setLikeBurst((value) => value + 1)
    onToggleLike(post)
  }

  return (
    <Card>
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Avatar className="size-9">
              <AvatarFallback className="text-xs font-semibold">
                {avatarLabel}
              </AvatarFallback>
            </Avatar>
            <div className="font-medium">@{post.owner_username}</div>
          </div>
          <div className="text-muted-foreground text-xs">{timeLabel}</div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {editing ? (
          <div className="space-y-2">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={pending}
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => {
                  setEditing(false)
                  setDraft(post.content)
                  setError(null)
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={pending || !draft.trim()}
                onClick={async () => {
                  if (!onUpdate) return
                  setError(null)
                  try {
                    await onUpdate(post.id, draft.trim())
                    setEditing(false)
                  } catch (e) {
                    const message = (e as { message?: string })?.message ?? "Failed to update"
                    setError(message)
                  }
                }}
              >
                Save
              </Button>
            </div>
          </div>
        ) : (
          <div className="whitespace-pre-wrap">{post.content}</div>
        )}
        {error ? <div className="text-destructive text-sm">{error}</div> : null}
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={pending}
          variant="outline"
          aria-pressed={post.is_liked}
          aria-label={post.is_liked ? "Unlike post" : "Like post"}
          className="gap-2"
          onClick={handleToggleLike}
        >
          <span
            key={likeBurst}
            className={cn(
              "flex items-center",
              likeBurst > 0 ? "motion-safe:animate-heart-pop" : "",
            )}
          >
            {post.is_liked ? (
              <IconHeartFilled className="text-rose-500" />
            ) : (
              <IconHeart className="text-muted-foreground" />
            )}
          </span>
          <span className="text-xs font-medium tabular-nums">
            {post.likes_count}
          </span>
        </Button>
        <Button
          size="sm"
          disabled={pending}
          variant="outline"
          aria-pressed={post.is_retweeted}
          aria-label={post.is_retweeted ? "Undo repost" : "Repost"}
          className="gap-2"
          onClick={() => onToggleRetweet(post)}
        >
          <IconRepeat
            className={cn(
              "text-muted-foreground",
              post.is_retweeted ? "text-emerald-600" : "",
            )}
          />
          <span className="text-xs font-medium tabular-nums">
            {post.retweets_count}
          </span>
        </Button>
        {isOwner ? (
          <>
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => {
                setEditing(true)
                setDraft(post.content)
                setError(null)
              }}
            >
              Edit
            </Button>
            {onDelete ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" disabled={pending}>
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent size="sm">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete post?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={async () => {
                        try {
                          await onDelete(post.id)
                        } catch {
                          setError("Failed to delete")
                        }
                      }}
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : null}
          </>
        ) : null}
      </CardFooter>
    </Card>
  )
}
