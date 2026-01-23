import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
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
import { ProfileHoverCard } from "@/components/ProfileHoverCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  const [likePulseKey, setLikePulseKey] = useState(0);
  const [retweetPulseKey, setRetweetPulseKey] = useState(0);
  const [retweetMenuOpen, setRetweetMenuOpen] = useState(false);
  const retweetMenuOpenedAt = useRef(0);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [bookmarkBusy, setBookmarkBusy] = useState(false);
  const [likeState, setLikeState] = useState({
    liked: post.is_liked,
    count: post.likes_count,
  });
  const [retweetState, setRetweetState] = useState({
    retweeted: post.is_retweeted,
    count: post.retweets_count,
  });
  const [likeCountKey, setLikeCountKey] = useState(0);
  const [retweetCountKey, setRetweetCountKey] = useState(0);
  const [likeCountDirection, setLikeCountDirection] = useState<"up" | "down">(
    "up",
  );
  const [retweetCountDirection, setRetweetCountDirection] = useState<
    "up" | "down"
  >("up");
  const avatarLabel = (post.owner_username || "?").slice(0, 2).toUpperCase();
  const avatarUrl = post.owner_avatar_url ?? null;
  const profilePath = `/profile/${encodeURIComponent(post.owner_username)}`;
  const mediaAlt = (() => {
    const snippet = post.content.trim().replace(/\s+/g, " ").slice(0, 80);
    if (snippet) return `Post image: ${snippet}`;
    return `Post image by @${post.owner_username}`;
  })();

  useEffect(() => {
    setLikeState({ liked: post.is_liked, count: post.likes_count });
    setRetweetState({
      retweeted: post.is_retweeted,
      count: post.retweets_count,
    });
  }, [
    post.id,
    post.is_liked,
    post.likes_count,
    post.is_retweeted,
    post.retweets_count,
  ]);

  const handleToggleLike = () => {
    setLikePulseKey((value) => value + 1);
    setLikeState((current) => {
      const nextLiked = !current.liked;
      const delta = nextLiked ? 1 : -1;
      const nextCount = Math.max(0, current.count + delta);
      setLikeCountDirection(delta > 0 ? "up" : "down");
      setLikeCountKey((key) => key + 1);
      return { liked: nextLiked, count: nextCount };
    });
    onToggleLike(post);
  };

  const handleToggleRetweet = () => {
    setRetweetPulseKey((value) => value + 1);
    setRetweetState((current) => {
      const nextRetweeted = !current.retweeted;
      const delta = nextRetweeted ? 1 : -1;
      const nextCount = Math.max(0, current.count + delta);
      setRetweetCountDirection(delta > 0 ? "up" : "down");
      setRetweetCountKey((key) => key + 1);
      return { retweeted: nextRetweeted, count: nextCount };
    });
    onToggleRetweet(post);
  };

  const handleRetweetMenuOpenChange = (open: boolean) => {
    setRetweetMenuOpen(open);
    if (open) {
      retweetMenuOpenedAt.current = Date.now();
    }
  };

  const handleToggleBookmark = async () => {
    if (bookmarkBusy) return;
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
          <ProfileHoverCard
            username={post.owner_username}
            userId={post.owner_id}
            avatarUrl={avatarUrl}
          >
            <Link
              to={profilePath}
              className="flex items-center gap-2 text-left"
              aria-label={`Open profile card for @${post.owner_username}`}
            >
              <Avatar className="size-9">
                {avatarUrl ? (
                  <AvatarImage src={avatarUrl} alt={post.owner_username} />
                ) : null}
                <AvatarFallback className="text-xs font-semibold">
                  {avatarLabel}
                </AvatarFallback>
              </Avatar>
              <div className="font-medium">@{post.owner_username}</div>
            </Link>
          </ProfileHoverCard>
          <div className="text-muted-foreground text-xs">{timeLabel}</div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {editing ? (
          <div className="space-y-2">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              aria-label="Edit post"
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
          <div className="whitespace-pre-wrap break-words">{post.content}</div>
        )}
        {post.media_url ? (
          <div className="overflow-hidden rounded-lg border border-border/50 bg-muted/20">
            <img
              src={post.media_url}
              alt={mediaAlt}
              // Fallback square size until media dimensions are available.
              width={1200}
              height={1200}
              loading="lazy"
              className="h-auto w-full max-h-105 object-contain"
            />
          </div>
        ) : null}
        {error ? <div className="text-destructive text-sm">{error}</div> : null}
      </CardContent>
      <CardFooter className="flex items-center gap-2 px-3 py-2">
        <div className="flex items-center gap-2">
          <Button
            size="xs"
            variant="outline"
            aria-pressed={likeState.liked}
            aria-label={likeState.liked ? "Unlike post" : "Like post"}
            className="gap-2"
            onClick={handleToggleLike}
          >
            <span
              key={likePulseKey}
              className="motion-safe:animate-[heart-pop_280ms_ease-out_1] flex items-center"
            >
              {likeState.liked ? (
                <IconHeartFilled className="text-rose-500" />
              ) : (
                <IconHeart className="text-muted-foreground" />
              )}
            </span>
            <span className="text-xs font-medium tabular-nums">
              <AnimatedCount
                direction={likeCountDirection}
                value={likeState.count}
                animationKey={likeCountKey}
              />
            </span>
          </Button>
          <DropdownMenu
            open={retweetMenuOpen}
            onOpenChange={handleRetweetMenuOpenChange}
          >
            <DropdownMenuTrigger asChild>
              <Button
                size="xs"
                variant="outline"
                aria-pressed={retweetState.retweeted}
                aria-label={
                  retweetState.retweeted ? "Repost menu" : "Repost menu"
                }
                className="gap-2"
              >
                <span
                  key={retweetPulseKey}
                  className="motion-safe:animate-[retweet-pop_220ms_ease-out_1] flex items-center"
                >
                  <IconRepeat
                    className={cn(
                      "text-muted-foreground transition-colors duration-150",
                      retweetState.retweeted ? "text-emerald-600" : "",
                    )}
                  />
                </span>
                <span className="text-xs font-medium tabular-nums">
                  <AnimatedCount
                    direction={retweetCountDirection}
                    value={retweetState.count}
                    animationKey={retweetCountKey}
                  />
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" side="top" sideOffset={-24}>
              <DropdownMenuItem
                onSelect={(event) => {
                  if (Date.now() - retweetMenuOpenedAt.current < 200) {
                    event.preventDefault();
                    return;
                  }
                  handleToggleRetweet();
                }}
              >
                {retweetState.retweeted ? "Undo Repost" : "Repost"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            size="xs"
            disabled={bookmarkBusy}
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
              <AlertDialogTitle>Delete Post?</AlertDialogTitle>
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

type AnimatedCountProps = {
  value: number;
  direction: "up" | "down";
  animationKey: number;
};

function AnimatedCount({ value, direction, animationKey }: AnimatedCountProps) {
  const animationClass =
    animationKey > 0
      ? direction === "up"
        ? "motion-safe:animate-[count-slide-up_160ms_ease-out_1]"
        : "motion-safe:animate-[count-slide-down_160ms_ease-out_1]"
      : "";

  return (
    <span className="inline-flex h-4 min-w-[1.5ch] items-center justify-center overflow-hidden tabular-nums">
      <span key={animationKey} className={animationClass}>
        {value}
      </span>
    </span>
  );
}
