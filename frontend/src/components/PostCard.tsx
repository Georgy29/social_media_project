import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  IconBookmark,
  IconBookmarkFilled,
  IconDotsVertical,
  IconEdit,
  IconHeart,
  IconHeartFilled,
  IconMessageCircle,
  IconRepeat,
  IconTrash,
} from "@tabler/icons-react";
import { toast } from "sonner";

import type { components } from "@/api/types";

import { cn } from "@/lib/utils";
import { getRouteScrollKey, rememberRouteScroll } from "@/lib/route-scroll";
import { AnimatedCount } from "@/components/AnimatedCount";
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
import { Separator } from "@/components/ui/separator";
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
  showCommentPreview = false,
  enableOpen = true,
  onCommentClick,
  styleMode = "card",
}: {
  post: PostWithCounts;
  pending?: boolean;
  isOwner?: boolean;
  showCommentPreview?: boolean;
  enableOpen?: boolean;
  onCommentClick?: () => void;
  styleMode?: "card" | "timeline";
  onToggleLike: (post: PostWithCounts) => void;
  onToggleRetweet: (post: PostWithCounts) => void;
  onToggleBookmark?: (
    post: PostWithCounts,
    nextState: boolean,
  ) => Promise<void> | void;
  onDelete?: (postId: number) => Promise<void>;
  onUpdate?: (postId: number, content: string) => Promise<unknown>;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const ts = new Date(post.timestamp);
  const timeLabel = Number.isNaN(ts.valueOf())
    ? post.timestamp
    : ts.toLocaleString();
  const MAX_POST_LENGTH = 280;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(post.content);
  const [error, setError] = useState<string | null>(null);
  const [likePulseKey, setLikePulseKey] = useState(0);
  const [retweetPulseKey, setRetweetPulseKey] = useState(0);
  const [retweetMenuOpen, setRetweetMenuOpen] = useState(false);
  const retweetMenuOpenedAt = useRef(0);
  const hasShownBookmarkToast = useRef(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [bookmarked, setBookmarked] = useState(post.is_bookmarked);
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
  const postDetailPath = `/posts/${post.id}`;
  const mediaAlt = (() => {
    const snippet = post.content.trim().replace(/\s+/g, " ").slice(0, 80);
    if (snippet) return `Post image: ${snippet}`;
    return `Post image by @${post.owner_username}`;
  })();
  const topCommentTimeLabel = post.top_comment_preview
    ? (() => {
        const created = new Date(post.top_comment_preview.created_at);
        return Number.isNaN(created.valueOf())
          ? post.top_comment_preview.created_at
          : created.toLocaleString();
      })()
    : null;
  const draftTooLong = draft.length > MAX_POST_LENGTH;
  const isTimeline = styleMode === "timeline";

  useEffect(() => {
    if (typeof window !== "undefined") {
      hasShownBookmarkToast.current =
        window.localStorage.getItem("bookmark-toast-seen") === "1";
    }
  }, []);

  useEffect(() => {
    setLikeState({ liked: post.is_liked, count: post.likes_count });
    setRetweetState({
      retweeted: post.is_retweeted,
      count: post.retweets_count,
    });
    setBookmarked(post.is_bookmarked);
  }, [
    post.id,
    post.is_liked,
    post.likes_count,
    post.is_retweeted,
    post.retweets_count,
    post.is_bookmarked,
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
      if (nextState && !hasShownBookmarkToast.current) {
        toast.success("Saved to Bookmarks");
        hasShownBookmarkToast.current = true;
        if (typeof window !== "undefined") {
          window.localStorage.setItem("bookmark-toast-seen", "1");
        }
      }
    } catch {
      setBookmarked(!nextState);
      toast.error("Failed to update bookmark");
    } finally {
      setBookmarkBusy(false);
    }
  };

  const openPostDetail = (options?: { focusCommentComposer?: boolean }) => {
    if (!enableOpen || editing) return;
    const fromRoute = getRouteScrollKey(location.pathname, location.search);
    rememberRouteScroll(fromRoute);
    navigate(postDetailPath, {
      state: {
        from: fromRoute,
        focusCommentComposer: Boolean(options?.focusCommentComposer),
      },
    });
  };

  const isInteractiveTarget = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return false;
    return Boolean(
      target.closest(
        "a,button,input,textarea,select,label,[role='button'],[role='menuitem'],[data-no-post-open='true']",
      ),
    );
  };

  const openComments = () => {
    if (onCommentClick) {
      onCommentClick();
      return;
    }
    openPostDetail({ focusCommentComposer: true });
  };

  const actionButtonClass = cn(
    "min-w-11 justify-center gap-1.5 rounded-full border-0 bg-transparent shadow-none transition-colors duration-150 hover:bg-muted/70",
    isTimeline ? "h-7 px-1.5" : "h-8 px-2",
  );
  const timelineCardClass =
    "rounded-none ring-0 bg-transparent py-2 gap-0 data-[size=sm]:gap-0 border-t border-b border-border/70 first:border-t-0 last:border-b-0";
  const timelineContentClass = cn(
    "px-3 pt-3 space-y-5",
    post.media_url ? "pb-0" : "pb-3",
  );
  const timelineFooterClass = cn(
    "bg-muted/20 rounded-none gap-1.5 px-3 py-1.5",
    post.media_url ? "border-t-0" : "border-t border-border/60",
  );
  const timelineTopCommentClass =
    "mx-2 my-1 rounded-md border border-border/40 bg-background px-3 py-2 hover:bg-muted/10";

  return (
    <Card
      size={isTimeline ? "sm" : "default"}
      role={enableOpen ? "link" : undefined}
      tabIndex={enableOpen ? 0 : undefined}
      aria-label={`Open post ${post.id}`}
      className={cn(
        "transition-colors",
        isTimeline ? timelineCardClass : "",
        editing || !enableOpen
          ? ""
          : isTimeline
            ? "cursor-pointer hover:bg-muted/30"
            : "cursor-pointer hover:bg-muted/10",
      )}
      onClick={(event) => {
        if (!enableOpen) return;
        if (isInteractiveTarget(event.target)) return;
        openPostDetail();
      }}
      onKeyDown={(event) => {
        if (!enableOpen) return;
        if (isInteractiveTarget(event.target)) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openPostDetail();
        }
      }}
    >
      <CardHeader className={cn("space-y-1", isTimeline ? "px-3" : "")}>
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
      <CardContent
        className={cn(
          "space-y-3",
          isTimeline ? timelineContentClass : "",
        )}
      >
        {editing ? (
          <div className="space-y-2">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              aria-label="Edit post"
              disabled={pending}
              maxLength={MAX_POST_LENGTH}
              rows={3}
            />
            <div className="flex items-center justify-between">
              <div
                className={cn(
                  "text-xs tabular-nums",
                  draftTooLong ? "text-destructive" : "text-muted-foreground",
                )}
                aria-label={`Character count ${draft.length} of ${MAX_POST_LENGTH}`}
              >
                {draft.length}/{MAX_POST_LENGTH}
              </div>
              {draftTooLong ? (
                <div className="text-destructive text-xs">
                  Too long (max {MAX_POST_LENGTH})
                </div>
              ) : null}
            </div>
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
                disabled={pending || !draft.trim() || draftTooLong}
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
          <div
            className={cn(
              "whitespace-pre-wrap break-words leading-6",
              isTimeline ? "pl-2" : "",
            )}
          >
            {post.content}
          </div>
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
      <CardFooter
        className={cn(
          "flex items-center gap-2 px-3 py-2",
          isTimeline ? timelineFooterClass : "",
        )}
      >
        <div className="flex items-center gap-1">
          <Button
            size="xs"
            variant="ghost"
            aria-pressed={likeState.liked}
            aria-label={likeState.liked ? "Unlike post" : "Like post"}
            title={likeState.liked ? "Unlike" : "Like"}
            className={actionButtonClass}
            onClick={handleToggleLike}
          >
            <span
              key={likePulseKey}
              className="motion-safe:animate-[heart-pop_280ms_ease-out_1] flex items-center"
            >
              {likeState.liked ? (
                <IconHeartFilled className="text-rose-500/90" />
              ) : (
                <IconHeart className="text-muted-foreground/80" />
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
                variant="ghost"
                aria-pressed={retweetState.retweeted}
                aria-label={
                  retweetState.retweeted ? "Repost menu" : "Repost menu"
                }
                title={retweetState.retweeted ? "Undo repost" : "Repost"}
                className={actionButtonClass}
              >
                <span
                  key={retweetPulseKey}
                  className="motion-safe:animate-[retweet-pop_220ms_ease-out_1] flex items-center"
                >
                  <IconRepeat
                    className={cn(
                      "text-muted-foreground/80 transition-colors duration-150",
                      retweetState.retweeted ? "text-emerald-600/90" : "",
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
            variant="ghost"
            aria-pressed={bookmarked}
            aria-label={bookmarked ? "Remove bookmark" : "Add bookmark"}
            title={bookmarked ? "Remove bookmark" : "Add bookmark"}
            className={actionButtonClass}
            onClick={handleToggleBookmark}
          >
            {bookmarked ? (
              <IconBookmarkFilled className="text-blue-500/90" />
            ) : (
              <IconBookmark className="text-muted-foreground/80" />
            )}
          </Button>
          <Button
            size="xs"
            variant="ghost"
            className={cn(
              "min-w-[88px] justify-center gap-1.5 rounded-full border-0 bg-transparent shadow-none transition-colors duration-150 hover:bg-muted/70",
              isTimeline ? "h-7 px-1.5" : "h-8 px-2",
            )}
            title="Comment"
            onClick={() => {
              if (onCommentClick) {
                onCommentClick();
                return;
              }
              openPostDetail({ focusCommentComposer: true });
            }}
            aria-label={`Open post ${post.id} comments`}
          >
            <IconMessageCircle />
            Comment
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
                  title="More"
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
      {isTimeline && !(showCommentPreview && post.top_comment_preview) ? (
        <Separator className="bg-border/60" />
      ) : null}
      {showCommentPreview && post.top_comment_preview ? (
        <div
          className={cn(
            "transition-colors duration-150 cursor-pointer",
            isTimeline
              ? timelineTopCommentClass
              : "rounded-lg border border-border/50 bg-muted/15 px-3 py-2 hover:bg-muted/30",
          )}
          role="button"
          tabIndex={0}
          onClick={(event) => {
            if (!(event.target instanceof HTMLElement)) return;
            if (event.target.closest("a")) return;
            event.stopPropagation();
            openComments();
          }}
          onKeyDown={(event) => {
            if (!(event.target instanceof HTMLElement)) return;
            if (event.target.closest("a")) return;
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              event.stopPropagation();
              openComments();
            }
          }}
        >
          <div className="min-w-0">
            <ProfileHoverCard
              username={post.top_comment_preview.user.username}
              userId={post.top_comment_preview.user.id}
              avatarUrl={post.top_comment_preview.user.avatar_url ?? null}
            >
              <Link
                to={`/profile/${encodeURIComponent(post.top_comment_preview.user.username)}`}
                className="inline-flex max-w-full items-center gap-2 text-sm font-semibold"
                aria-label={`Open profile card for @${post.top_comment_preview.user.username}`}
              >
                <Avatar className="size-7">
                  {post.top_comment_preview.user.avatar_url ? (
                    <AvatarImage
                      src={post.top_comment_preview.user.avatar_url}
                      alt={post.top_comment_preview.user.username}
                    />
                  ) : null}
                  <AvatarFallback className="text-[10px] font-semibold">
                    {(post.top_comment_preview.user.username || "?")
                      .slice(0, 2)
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                @{post.top_comment_preview.user.username}
              </Link>
            </ProfileHoverCard>
            <div className="mt-1 pl-9 text-sm leading-5 break-words">
              {post.top_comment_preview.content}
            </div>
            <div className="mt-1.5 pl-9 flex items-center justify-between gap-3">
              <div className="text-muted-foreground/90 text-xs">
                {topCommentTimeLabel}
              </div>
              <div className="text-muted-foreground/90 text-xs">
                {post.top_comment_preview.like_count} likes
              </div>
            </div>
          </div>
        </div>
      ) : null}
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
