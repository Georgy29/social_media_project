import { useCallback, useLayoutEffect, useState } from "react";
import { IconArrowLeft } from "@tabler/icons-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  useCreatePostMutation,
  useLogout,
  useMeQuery,
  usePostWithCountsQuery,
} from "@/api/queries";
import { PostComposerDialog } from "@/components/PostComposerDialog";
import { PostCard } from "@/components/PostCard";
import { AlertDialog } from "@/components/animate-ui/components/radix/alert-dialog";
import { CommentThread } from "@/components/comments/CommentThread";
import { AppShell } from "@/components/layout/AppShell";
import { BrandHeader } from "@/components/layout/BrandHeader";
import { LogoutDialogContent } from "@/components/layout/LogoutDialogContent";
import { LogoutButton } from "@/components/layout/LogoutButton";
import { AppSidebar } from "@/components/sidebar/AppSidebar";
import { FeedRightRail } from "@/components/sidebar/FeedRightRail";
import { getSidebarUser } from "@/components/sidebar/sidebar-user";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { usePostCardActions } from "@/hooks/usePostCardActions";

type PostDetailLocationState = {
  from?: string;
  focusCommentComposer?: boolean;
};

export default function PostDetailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const logout = useLogout();
  const { postId } = useParams();
  const parsedPostId = Number(postId);
  const postIdNumber = Number.isInteger(parsedPostId)
    ? parsedPostId
    : undefined;

  const meQuery = useMeQuery();
  const createPostMutation = useCreatePostMutation();
  const handleDeleteSuccess = useCallback(() => {
    navigate("/feed", { replace: true });
  }, [navigate]);
  const {
    isPostMutating,
    handleToggleLike,
    handleToggleRetweet,
    handleToggleBookmark,
    handleUpdatePost,
    handleDeletePost,
  } = usePostCardActions({
    onDeleteSuccess: handleDeleteSuccess,
  });
  const postQuery = usePostWithCountsQuery(postIdNumber);

  const [composerOpen, setComposerOpen] = useState(false);
  const [commentFocusKey, setCommentFocusKey] = useState(0);

  const locationState = location.state as PostDetailLocationState | null;
  const shouldFocusCommentComposer = Boolean(
    locationState?.focusCommentComposer,
  );

  useLayoutEffect(() => {
    if (shouldFocusCommentComposer) return;
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }
  }, [location.key, shouldFocusCommentComposer]);

  const username = meQuery.data?.username ?? "guest";
  const sidebarUser = getSidebarUser(meQuery.data, {
    name: username,
    handle: username,
    avatarAlt: username,
  });
  const profilePath = meQuery.data?.username
    ? `/profile/${meQuery.data.username}`
    : "/feed";

  const handleBack = () => {
    if (locationState?.from) {
      navigate(-1);
      return;
    }
    navigate("/feed");
  };

  const handleHomeClick = () => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const handleCreatePost = async (content: string, mediaId: number | null) => {
    const payload = mediaId ? { content, media_id: mediaId } : { content };
    try {
      await createPostMutation.mutateAsync(payload);
      return true;
    } catch {
      return false;
    }
  };

  return (
    <>
      <AlertDialog>
        <AppShell
          sidebar={
            <AppSidebar
              user={sidebarUser}
              activeItem="feed"
              homeHref="/feed"
              profileHref={profilePath}
              onHomeClick={handleHomeClick}
              onCompose={() => setComposerOpen(true)}
              logoutAction={<LogoutButton className="w-full" />}
            />
          }
          rightRail={<FeedRightRail />}
          mainClassName="space-y-3"
        >
          <BrandHeader onClick={handleHomeClick} />

          <Card className="sticky top-0 z-10 border-border/70 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
            <CardContent className="flex items-center gap-2 px-3 py-2">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={handleBack}
                aria-label="Back"
              >
                <IconArrowLeft className="size-4" />
              </Button>
              <div className="text-base font-semibold">Post</div>
            </CardContent>
          </Card>

          {!postIdNumber ? (
            <Card>
              <CardContent className="text-muted-foreground p-6 text-center">
                Invalid post id.
              </CardContent>
            </Card>
          ) : postQuery.isPending ? (
            <div className="flex justify-center py-10">
              <Spinner size="lg" />
            </div>
          ) : postQuery.isError ? (
            <Card>
              <CardContent className="text-destructive p-6 text-center">
                {postQuery.error.message}
              </CardContent>
            </Card>
          ) : (
            <>
              <PostCard
                post={postQuery.data}
                pending={isPostMutating(postQuery.data.id)}
                isOwner={meQuery.data?.id === postQuery.data.owner_id}
                enableOpen={false}
                onCommentClick={() => setCommentFocusKey((value) => value + 1)}
                onToggleLike={handleToggleLike}
                onToggleRetweet={handleToggleRetweet}
                onToggleBookmark={handleToggleBookmark}
                onUpdate={handleUpdatePost}
                onDelete={handleDeletePost}
              />

              <CommentThread
                postId={postIdNumber}
                currentUserId={meQuery.data?.id}
                autoFocusComposer={shouldFocusCommentComposer}
                focusRequestKey={commentFocusKey}
              />
            </>
          )}
        </AppShell>
        <LogoutDialogContent onConfirm={handleLogout} />
      </AlertDialog>

      <PostComposerDialog
        open={composerOpen}
        onOpenChange={setComposerOpen}
        pending={createPostMutation.isPending}
        onCreate={(content, mediaId) => handleCreatePost(content, mediaId)}
      />
    </>
  );
}
