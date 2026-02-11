import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { Link } from "react-router-dom";
import {
  IconDotsVertical,
  IconEdit,
  IconHeart,
  IconHeartFilled,
  IconMessageCircle,
  IconTrash,
} from "@tabler/icons-react";

import { toApiError } from "@/api/client";
import type { components } from "@/api/types";
import {
  useCreateCommentMutation,
  useDeleteCommentMutation,
  useRepliesQuery,
  useToggleCommentLikeMutation,
  useTopLevelCommentsQuery,
  useUpdateCommentMutation,
} from "@/api/queries";
import { AnimatedCount } from "@/components/AnimatedCount";
import { ProfileHoverCard } from "@/components/ProfileHoverCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/date";
import { cn } from "@/lib/utils";

type CommentResponse = components["schemas"]["CommentResponse"];
type CommentCreate = components["schemas"]["CommentCreate"];

type ReplyTarget = {
  parentId: number;
  replyToCommentId?: number;
  replyToUserId?: number;
  replyToUsername: string;
};

type EditingTarget = {
  commentId: number;
  parentId?: number | null;
  content: string;
};

type CommentThreadProps = {
  postId: number;
  currentUserId?: number;
  currentUserIsAdmin?: boolean;
  autoFocusComposer?: boolean;
  focusRequestKey?: number;
};

type CommentItemProps = {
  comment: CommentResponse;
  nested?: boolean;
  canManage?: boolean;
  onReply?: () => void;
  onToggleLike?: () => void;
  isLikeUpdating?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  isDeletePending?: boolean;
};

function CommentItem({
  comment,
  nested = false,
  canManage,
  onReply,
  onToggleLike,
  isLikeUpdating = false,
  onEdit,
  onDelete,
  isDeletePending = false,
}: CommentItemProps) {
  const profilePath = `/profile/${encodeURIComponent(comment.user.username)}`;
  const avatarLabel = (comment.user.username || "?").slice(0, 2).toUpperCase();
  const replyToPath = comment.reply_to_user
    ? `/profile/${encodeURIComponent(comment.reply_to_user.username)}`
    : null;
  const [likeCountKey, setLikeCountKey] = useState(0);
  const [likeCountDirection, setLikeCountDirection] = useState<"up" | "down">(
    "up",
  );
  const [likePulseKey, setLikePulseKey] = useState(0);
  const isEdited = (() => {
    const createdAt = new Date(comment.created_at).getTime();
    const updatedAt = new Date(comment.updated_at).getTime();
    if (!Number.isFinite(createdAt) || !Number.isFinite(updatedAt))
      return false;
    return updatedAt > createdAt;
  })();

  const handleToggleLike = () => {
    if (!onToggleLike) return;
    const delta = comment.is_liked ? -1 : 1;
    setLikePulseKey((value) => value + 1);
    setLikeCountDirection(delta > 0 ? "up" : "down");
    setLikeCountKey((key) => key + 1);
    onToggleLike();
  };

  return (
    <div
      className={cn(
        "space-y-2 rounded-md -mx-2 px-2 transition-colors duration-150",
        nested ? "py-2 hover:bg-muted/35" : "py-3 hover:bg-muted/30",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <ProfileHoverCard
          username={comment.user.username}
          userId={comment.user.id}
          avatarUrl={comment.user.avatar_url ?? null}
        >
          <Link
            to={profilePath}
            className="flex min-w-0 items-center gap-2"
            aria-label={`Open profile card for @${comment.user.username}`}
          >
            <Avatar className="size-8">
              {comment.user.avatar_url ? (
                <AvatarImage
                  src={comment.user.avatar_url}
                  alt={comment.user.username}
                />
              ) : null}
              <AvatarFallback className="text-[11px] font-semibold">
                {avatarLabel}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 text-sm font-semibold truncate">
              @{comment.user.username}
            </div>
          </Link>
        </ProfileHoverCard>
        <div className="text-muted-foreground text-xs shrink-0">
          {formatDateTime(comment.created_at)}
          {isEdited ? (
            <span className="ml-1 text-muted-foreground/80">· Edited</span>
          ) : null}
        </div>
      </div>

      <div
        className={cn(
          "whitespace-pre-wrap break-words text-sm leading-6",
          nested ? "pl-9" : "pl-10",
        )}
      >
        {comment.reply_to_user && replyToPath ? (
          <>
            <ProfileHoverCard
              username={comment.reply_to_user.username}
              userId={comment.reply_to_user.id}
              avatarUrl={comment.reply_to_user.avatar_url ?? null}
            >
              <Link
                to={replyToPath}
                className="mr-1 inline-flex text-sm font-medium text-sky-600 hover:underline dark:text-sky-400"
                aria-label={`Open profile card for @${comment.reply_to_user.username}`}
              >
                @{comment.reply_to_user.username}
              </Link>
            </ProfileHoverCard>
          </>
        ) : null}
        <span>{comment.content}</span>
      </div>

      <div className={cn("flex items-center gap-2", nested ? "pl-9" : "pl-10")}>
        {onToggleLike ? (
          <Button
            type="button"
            size="xs"
            variant="ghost"
            className="gap-1.5 rounded-full border-0 bg-transparent shadow-none hover:bg-muted/60"
            onClick={handleToggleLike}
            disabled={isLikeUpdating}
            aria-label={comment.is_liked ? "Unlike comment" : "Like comment"}
          >
            <span
              key={likePulseKey}
              className="motion-safe:animate-[heart-pop_280ms_ease-out_1] flex items-center"
            >
              {comment.is_liked ? (
                <IconHeartFilled className="text-rose-500" />
              ) : (
                <IconHeart className="text-muted-foreground" />
              )}
            </span>
            <span className="text-xs font-medium tabular-nums">
              <AnimatedCount
                direction={likeCountDirection}
                value={comment.like_count}
                animationKey={likeCountKey}
              />
            </span>
          </Button>
        ) : null}

        {onReply ? (
          <Button
            type="button"
            size="xs"
            variant="ghost"
            className="gap-1.5"
            onClick={onReply}
          >
            <IconMessageCircle />
            Reply
          </Button>
        ) : null}

        {canManage && (onEdit || onDelete) ? (
          <div className="ml-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Comment actions"
                >
                  <IconDotsVertical className="h-4 w-4" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onEdit ? (
                  <DropdownMenuItem onSelect={onEdit}>
                    <IconEdit className="h-4 w-4" aria-hidden="true" />
                    Edit
                  </DropdownMenuItem>
                ) : null}
                {onDelete ? (
                  <DropdownMenuItem
                    variant="destructive"
                    disabled={isDeletePending}
                    onSelect={onDelete}
                  >
                    <IconTrash className="h-4 w-4" aria-hidden="true" />
                    {isDeletePending ? "Deleting..." : "Delete"}
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function CommentEditForm({
  value,
  error,
  pending,
  onChange,
  onCancel,
  onSubmit,
}: {
  value: string;
  error: string | null;
  pending: boolean;
  onChange: (value: string) => void;
  onCancel: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-2 rounded-md border p-3">
      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        maxLength={400}
        rows={3}
      />
      <div className="flex items-center gap-2">
        {error ? (
          <div className="text-destructive text-xs">{error}</div>
        ) : (
          <div className="text-muted-foreground text-xs">
            {value.length}/400
          </div>
        )}
        <Button
          type="button"
          variant="ghost"
          className="ml-auto"
          onClick={onCancel}
          disabled={pending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={pending || !value.trim()}>
          {pending ? "Saving..." : "Save"}
        </Button>
      </div>
    </form>
  );
}

function RepliesSection({
  topCommentId,
  currentUserId,
  currentUserIsAdmin = false,
  editingTarget,
  editError,
  onStartEdit,
  onEditContentChange,
  onSubmitEdit,
  onCancelEdit,
  onDelete,
  isUpdatePending,
  isDeletePending,
  onReplyToReply,
  onToggleLike,
  isLikeUpdating,
}: {
  topCommentId: number;
  currentUserId?: number;
  currentUserIsAdmin?: boolean;
  editingTarget: EditingTarget | null;
  editError: string | null;
  onStartEdit: (comment: CommentResponse, parentId?: number | null) => void;
  onEditContentChange: (value: string) => void;
  onSubmitEdit: (event: FormEvent<HTMLFormElement>) => void;
  onCancelEdit: () => void;
  onDelete: (comment: CommentResponse, parentId?: number | null) => void;
  isUpdatePending: (commentId: number) => boolean;
  isDeletePending: (commentId: number) => boolean;
  onReplyToReply: (comment: CommentResponse) => void;
  onToggleLike: (comment: CommentResponse, parentId: number) => void;
  isLikeUpdating: (commentId: number) => boolean;
}) {
  const repliesQuery = useRepliesQuery(topCommentId, { limit: 5 });
  const replies = repliesQuery.data?.pages.flatMap((page) => page.items) ?? [];

  if (repliesQuery.isPending) {
    return (
      <div className="ml-6 flex justify-center py-2">
        <Spinner />
      </div>
    );
  }

  if (repliesQuery.isError) {
    return (
      <div className="text-destructive ml-6 text-xs">
        Failed to load replies: {repliesQuery.error.message}
      </div>
    );
  }

  if (replies.length === 0) return null;

  return (
    <div className="ml-7 mt-1 space-y-1 border-l border-border/50 pl-3">
      {replies.map((reply) => {
        const isEditing = editingTarget?.commentId === reply.id;
        const isOwner = currentUserId === reply.user.id;
        const canDelete = isOwner || currentUserIsAdmin;

        return (
          <div key={reply.id}>
            {isEditing ? (
              <CommentEditForm
                value={editingTarget.content}
                error={editError}
                pending={isUpdatePending(reply.id)}
                onChange={onEditContentChange}
                onCancel={onCancelEdit}
                onSubmit={onSubmitEdit}
              />
            ) : (
              <CommentItem
                comment={reply}
                nested
                canManage={isOwner || currentUserIsAdmin}
                onReply={() => onReplyToReply(reply)}
                onToggleLike={() => onToggleLike(reply, topCommentId)}
                isLikeUpdating={isLikeUpdating(reply.id)}
                onEdit={isOwner ? () => onStartEdit(reply, topCommentId) : undefined}
                onDelete={canDelete ? () => onDelete(reply, topCommentId) : undefined}
                isDeletePending={isDeletePending(reply.id)}
              />
            )}
          </div>
        );
      })}

      {repliesQuery.hasNextPage ? (
        <Button
          size="sm"
          variant="outline"
          onClick={() => void repliesQuery.fetchNextPage()}
          disabled={repliesQuery.isFetchingNextPage}
          className="h-8"
        >
          {repliesQuery.isFetchingNextPage ? "Loading..." : "Load more replies"}
        </Button>
      ) : null}
    </div>
  );
}

export function CommentThread({
  postId,
  currentUserId,
  currentUserIsAdmin = false,
  autoFocusComposer = false,
  focusRequestKey,
}: CommentThreadProps) {
  const commentsQuery = useTopLevelCommentsQuery(postId, { limit: 10 });
  const createCommentMutation = useCreateCommentMutation();
  const updateCommentMutation = useUpdateCommentMutation();
  const deleteCommentMutation = useDeleteCommentMutation();
  const toggleCommentLikeMutation = useToggleCommentLikeMutation();
  const topComments =
    commentsQuery.data?.pages.flatMap((page) => page.items) ?? [];

  const [commentDraft, setCommentDraft] = useState("");
  const [commentError, setCommentError] = useState<string | null>(null);
  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [replyError, setReplyError] = useState<string | null>(null);
  const [editingTarget, setEditingTarget] = useState<EditingTarget | null>(
    null,
  );
  const [editError, setEditError] = useState<string | null>(null);
  const [commentActionError, setCommentActionError] = useState<string | null>(
    null,
  );

  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const hasAutoFocusedComposerRef = useRef(false);

  useEffect(() => {
    hasAutoFocusedComposerRef.current = false;
  }, [postId]);

  const focusComposer = useCallback(() => {
    window.requestAnimationFrame(() => {
      const element = composerRef.current;
      if (!element) return;
      element.focus({ preventScroll: true });
      const cursorAt = element.value.length;
      element.setSelectionRange(cursorAt, cursorAt);
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, []);

  useEffect(() => {
    if (!autoFocusComposer || hasAutoFocusedComposerRef.current) return;
    hasAutoFocusedComposerRef.current = true;
    focusComposer();
  }, [autoFocusComposer, postId, focusComposer]);

  useEffect(() => {
    if (typeof focusRequestKey !== "number") return;
    focusComposer();
  }, [focusRequestKey, focusComposer]);

  const openReplyToTopComment = (comment: CommentResponse) => {
    setReplyTarget({
      parentId: comment.id,
      replyToUserId: comment.user.id,
      replyToUsername: comment.user.username,
    });
    setReplyDraft("");
    setReplyError(null);
  };

  const openReplyToReply = (topCommentId: number, reply: CommentResponse) => {
    setReplyTarget({
      parentId: topCommentId,
      replyToCommentId: reply.id,
      replyToUserId: reply.user.id,
      replyToUsername: reply.user.username,
    });
    setReplyDraft("");
    setReplyError(null);
  };

  const cancelReply = () => {
    setReplyTarget(null);
    setReplyDraft("");
    setReplyError(null);
  };

  const startEditingComment = (
    comment: CommentResponse,
    parentId?: number | null,
  ) => {
    setEditingTarget({
      commentId: comment.id,
      parentId,
      content: comment.content,
    });
    setEditError(null);
    setCommentActionError(null);
  };

  const cancelEditingComment = () => {
    setEditingTarget(null);
    setEditError(null);
  };

  const onEditedContentChange = (value: string) => {
    setEditingTarget((prev) => (prev ? { ...prev, content: value } : prev));
    if (editError) setEditError(null);
  };

  const submitTopLevelComment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const content = commentDraft.trim();
    if (!content) {
      setCommentError("Comment cannot be empty.");
      return;
    }

    try {
      await createCommentMutation.mutateAsync({
        postId,
        payload: { content },
      });
      setCommentDraft("");
      setCommentError(null);
      setCommentActionError(null);
    } catch (error) {
      setCommentError(toApiError(error).message);
    }
  };

  const submitReplyComment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!replyTarget) return;

    const content = replyDraft.trim();
    if (!content) {
      setReplyError("Reply cannot be empty.");
      return;
    }

    const payload: CommentCreate = {
      content,
      parent_id: replyTarget.parentId,
      reply_to_user_id: replyTarget.replyToUserId,
    };
    if (replyTarget.replyToCommentId != null) {
      payload.reply_to_comment_id = replyTarget.replyToCommentId;
    }

    try {
      await createCommentMutation.mutateAsync({ postId, payload });
      setReplyDraft("");
      setReplyError(null);
      setReplyTarget(null);
      setCommentActionError(null);
    } catch (error) {
      setReplyError(toApiError(error).message);
    }
  };

  const submitEditedComment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingTarget) return;

    const content = editingTarget.content.trim();
    if (!content) {
      setEditError("Comment cannot be empty.");
      return;
    }

    try {
      await updateCommentMutation.mutateAsync({
        commentId: editingTarget.commentId,
        payload: { content },
      });
      setEditingTarget(null);
      setEditError(null);
      setCommentActionError(null);
    } catch (error) {
      setEditError(toApiError(error).message);
    }
  };

  const isLikeUpdating = (commentId: number) =>
    toggleCommentLikeMutation.isPending &&
    toggleCommentLikeMutation.variables?.commentId === commentId;

  const isUpdatePending = (commentId: number) =>
    updateCommentMutation.isPending &&
    updateCommentMutation.variables?.commentId === commentId;

  const isDeletePending = (commentId: number) =>
    deleteCommentMutation.isPending &&
    deleteCommentMutation.variables?.commentId === commentId;

  const handleToggleCommentLike = (
    comment: CommentResponse,
    parentId?: number | null,
  ) => {
    if (isLikeUpdating(comment.id)) return;

    toggleCommentLikeMutation.mutate({
      commentId: comment.id,
      postId,
      parentId,
      isLiked: comment.is_liked,
    });
  };

  const handleDeleteComment = async (
    comment: CommentResponse,
    parentId?: number | null,
  ) => {
    if (!window.confirm("Delete this comment? This cannot be undone.")) return;

    try {
      await deleteCommentMutation.mutateAsync({
        commentId: comment.id,
        postId,
        parentId,
      });

      if (editingTarget?.commentId === comment.id) {
        cancelEditingComment();
      }
      if (
        replyTarget?.replyToCommentId === comment.id ||
        replyTarget?.parentId === comment.id
      ) {
        cancelReply();
      }
      setCommentActionError(null);
    } catch (error) {
      setCommentActionError(toApiError(error).message);
    }
  };

  return (
    <Card id="post-comments">
      <CardHeader>
        <div className="font-medium">Comments</div>
      </CardHeader>
      <CardContent className="space-y-3">
        {commentActionError ? (
          <div className="text-destructive text-sm">{commentActionError}</div>
        ) : null}

        <form onSubmit={submitTopLevelComment} className="space-y-2">
          <Textarea
            ref={composerRef}
            value={commentDraft}
            onChange={(event) => {
              setCommentDraft(event.target.value);
              if (commentError) setCommentError(null);
            }}
            placeholder="Write a comment..."
            maxLength={400}
            rows={3}
          />
          <div className="flex items-center gap-2">
            {commentError ? (
              <div className="text-destructive text-xs">{commentError}</div>
            ) : (
              <div className="text-muted-foreground text-xs">
                {commentDraft.length}/400
              </div>
            )}
            <Button
              type="submit"
              className="ml-auto"
              disabled={createCommentMutation.isPending || !commentDraft.trim()}
            >
              {createCommentMutation.isPending ? "Posting..." : "Post comment"}
            </Button>
          </div>
        </form>

        {commentsQuery.isPending ? (
          <div className="flex justify-center py-4">
            <Spinner />
          </div>
        ) : commentsQuery.isError ? (
          <div className="text-destructive text-sm">
            Failed to load comments: {commentsQuery.error.message}
          </div>
        ) : topComments.length === 0 ? (
          <div className="text-muted-foreground text-sm">No comments yet.</div>
        ) : (
          <div className="divide-y divide-border/50">
            {topComments.map((comment) => {
              const isEditing = editingTarget?.commentId === comment.id;
              const isOwner = currentUserId === comment.user.id;
              const canDelete = isOwner || currentUserIsAdmin;

              return (
                <div key={comment.id}>
                  {isEditing ? (
                    <CommentEditForm
                      value={editingTarget.content}
                      error={editError}
                      pending={isUpdatePending(comment.id)}
                      onChange={onEditedContentChange}
                      onCancel={cancelEditingComment}
                      onSubmit={submitEditedComment}
                    />
                  ) : (
                    <CommentItem
                      comment={comment}
                      canManage={isOwner || currentUserIsAdmin}
                      onReply={() => openReplyToTopComment(comment)}
                      onToggleLike={() =>
                        handleToggleCommentLike(comment, null)
                      }
                      isLikeUpdating={isLikeUpdating(comment.id)}
                      onEdit={isOwner ? () => startEditingComment(comment, null) : undefined}
                      onDelete={canDelete ? () => handleDeleteComment(comment, null) : undefined}
                      isDeletePending={isDeletePending(comment.id)}
                    />
                  )}

                  <RepliesSection
                    topCommentId={comment.id}
                    currentUserId={currentUserId}
                    currentUserIsAdmin={currentUserIsAdmin}
                    editingTarget={editingTarget}
                    editError={editError}
                    onStartEdit={startEditingComment}
                    onEditContentChange={onEditedContentChange}
                    onSubmitEdit={submitEditedComment}
                    onCancelEdit={cancelEditingComment}
                    onDelete={handleDeleteComment}
                    isUpdatePending={isUpdatePending}
                    isDeletePending={isDeletePending}
                    onReplyToReply={(reply) =>
                      openReplyToReply(comment.id, reply)
                    }
                    onToggleLike={handleToggleCommentLike}
                    isLikeUpdating={isLikeUpdating}
                  />

                  {replyTarget?.parentId === comment.id ? (
                    <form
                      onSubmit={submitReplyComment}
                      className="ml-7 mt-1 space-y-2 border-l border-border/50 pl-3 pb-2"
                    >
                      <div className="text-muted-foreground text-xs">
                        Replying to @{replyTarget.replyToUsername}
                      </div>
                      <Textarea
                        value={replyDraft}
                        onChange={(event) => {
                          setReplyDraft(event.target.value);
                          if (replyError) setReplyError(null);
                        }}
                        placeholder="Write a reply..."
                        maxLength={400}
                        rows={2}
                      />
                      <div className="flex items-center gap-2">
                        {replyError ? (
                          <div className="text-destructive text-xs">
                            {replyError}
                          </div>
                        ) : (
                          <div className="text-muted-foreground text-xs">
                            {replyDraft.length}/400
                          </div>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          className="ml-auto"
                          onClick={cancelReply}
                          disabled={createCommentMutation.isPending}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={
                            createCommentMutation.isPending ||
                            !replyDraft.trim()
                          }
                        >
                          {createCommentMutation.isPending
                            ? "Posting..."
                            : "Reply"}
                        </Button>
                      </div>
                    </form>
                  ) : null}
                </div>
              );
            })}

            {commentsQuery.hasNextPage ? (
              <Button
                variant="outline"
                onClick={() => void commentsQuery.fetchNextPage()}
                disabled={commentsQuery.isFetchingNextPage}
              >
                {commentsQuery.isFetchingNextPage
                  ? "Loading..."
                  : "Load more comments"}
              </Button>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
