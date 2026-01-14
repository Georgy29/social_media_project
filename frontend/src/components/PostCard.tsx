import { useState } from "react"

import type { components } from "@/api/types"

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

  return (
    <Card>
      <CardHeader className="space-y-1">
        <div className="flex items-baseline justify-between gap-2">
          <div className="font-medium">@{post.owner_username}</div>
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
