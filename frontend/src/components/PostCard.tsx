import { useState } from "react";
import {
  IconBookmark,
  IconBookmarkFilled,
  IconDotsVertical,
  IconEdit,
  IconHeart,
  IconHeartFilled,
  IconRepeat,
  IconTrash,
} from "@tabler/icons-react";
import { toast } from "sonner";

import type { components } from "@/api/types";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export type PostWithCounts = components["schemas"]["PostWithCounts"];

export function PostCard({
  post,
  onToggleLike,
  onToggleRetweet,
  onToggleBookmark,
  onDelete,
  onUpdate,
  isOwner = false,
  pending = false,
}: {
  post: PostWithCounts;
  pending?: boolean;
  isOwner?: boolean;
  onToggleLike: (post: PostWithCounts) => void;
  onToggleRetweet: (post: PostWithCounts) => void;
  onToggleBookmark?: (
    post: PostWithCounts,
    nextState: boolean,
  ) => Promise<void> | void;
  onDelete?: (postId: number) => Promise<void>;
  onUpdate?: (postId: number, content: string) => Promise<unknown>;
}) {
  const ts = new Date(post.timestamp);
  const timeLabel = Number.isNaN(ts.valueOf())
    ? post.timestamp
    : ts.toLocaleString();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(post.content);
  const [error, setError] = useState<string | null>(null);
  const [likeBurst, setLikeBurst] = useState(0);
  const [retweetBurst, setRetweetBurst] = useState(0);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [bookmarkBusy, setBookmarkBusy] = useState(false);
  const avatarLabel = (post.owner_username || "?").slice(0, 2).toUpperCase();

  const handleToggleLike = () => {
    setLikeBurst((value) => value + 1);
    onToggleLike(post);
  };

  const handleToggleRetweet = () => {
    setRetweetBurst((value) => value + 1);
    onToggleRetweet(post);
  };

  const handleToggleBookmark = async () => {
    if (pending || bookmarkBusy) return;
    const nextState = !bookmarked;
    setBookmarked(nextState);
    setBookmarkBusy(true);
    try {
      await onToggleBookmark?.(post, nextState);
      toast.success(nextState ? "Bookmarked" : "Bookmark removed");
    } catch {
      setBookmarked(!nextState);
      toast.error("Failed to update bookmark");
    } finally {
      setBookmarkBusy(false);
    }
  };

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
                  setEditing(false);
                  setDraft(post.content);
                  setError(null);
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={pending || !draft.trim()}
                onClick={async () => {
                  if (!onUpdate) return;
                  setError(null);
                  try {
                    await onUpdate(post.id, draft.trim());
                    setEditing(false);
                  } catch (e) {
                    const message =
                      (e as { message?: string })?.message ??
                      "Failed to update";
                    setError(message);
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
      <CardFooter className="flex items-center gap-2 px-3 py-2">
        <div className="flex items-center gap-2">
          <Button
            size="xs"
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
                likeBurst > 0
                  ? "motion-safe:animate-[heart-pop_280ms_ease-out_1]"
                  : "",
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
            size="xs"
            disabled={pending}
            variant="outline"
            aria-pressed={post.is_retweeted}
            aria-label={post.is_retweeted ? "Undo repost" : "Repost"}
            className="gap-2"
            onClick={handleToggleRetweet}
          >
            <span
              key={retweetBurst}
              className={cn(
                "flex items-center",
                retweetBurst > 0
                  ? "motion-safe:animate-[retweet-pop_220ms_ease-out_1]"
                  : "",
              )}
            >
              <IconRepeat
                className={cn(
                  "text-muted-foreground transition-colors duration-150",
                  post.is_retweeted ? "text-emerald-600" : "",
                )}
              />
            </span>
            <span className="text-xs font-medium tabular-nums">
              {post.retweets_count}
            </span>
          </Button>
          <Button
            size="xs"
            disabled={pending || bookmarkBusy}
            variant="outline"
            aria-pressed={bookmarked}
            aria-label={bookmarked ? "Remove bookmark" : "Add bookmark"}
            className="gap-2"
            onClick={handleToggleBookmark}
          >
            {bookmarked ? (
              <IconBookmarkFilled className="text-blue-500" />
            ) : (
              <IconBookmark className="text-muted-foreground" />
            )}
          </Button>
        </div>
        {isOwner ? (
          <div className="ml-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Post actions"
                  disabled={pending}
                >
                  <IconDotsVertical className="h-4 w-4" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onSelect={() => {
                    setEditing(true);
                    setDraft(post.content);
                    setError(null);
                  }}
                >
                  <IconEdit className="h-4 w-4" aria-hidden="true" />
                  Edit
                </DropdownMenuItem>
                {onDelete ? (
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={() => setDeleteOpen(true)}
                  >
                    <IconTrash className="h-4 w-4" aria-hidden="true" />
                    Delete
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : null}
      </CardFooter>
      {onDelete ? (
        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
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
                variant="destructive"
                onClick={async () => {
                  try {
                    await onDelete(post.id);
                    setDeleteOpen(false);
                  } catch {
                    setError("Failed to delete");
                  }
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </Card>
  );
}
