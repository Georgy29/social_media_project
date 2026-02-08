import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { PostComposerDialog } from "@/components/PostComposerDialog";
import { PostCard } from "@/components/PostCard";
import { AppShell } from "@/components/layout/AppShell";
import { BrandHeader } from "@/components/layout/BrandHeader";
import { LogoutDialogContent } from "@/components/layout/LogoutDialogContent";
import { LogoutButton } from "@/components/layout/LogoutButton";
import { PageHeader } from "@/components/layout/PageHeader";
import { AlertDialog } from "@/components/animate-ui/components/radix/alert-dialog";
import { AppSidebar } from "@/components/sidebar/AppSidebar";
import { FeedRightRail } from "@/components/sidebar/FeedRightRail";
import { getSidebarUser } from "@/components/sidebar/sidebar-user";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { usePostCardActions } from "@/hooks/usePostCardActions";

import { type ApiError } from "@/api/client";
import { getRouteScrollKey, restoreRouteScroll } from "@/lib/route-scroll";
import {
  useBookmarksQuery,
  useCreatePostMutation,
  useLogout,
  useMeQuery,
} from "@/api/queries";

export default function BookmarksPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const logout = useLogout();
  const meQuery = useMeQuery();
  const restoredRouteRef = useRef<string | null>(null);

  const [page, setPage] = useState(0);
  const limit = 10;
  const params = useMemo(() => ({ skip: page * limit, limit }), [page, limit]);

  const bookmarksQuery = useBookmarksQuery(params);
  const createPostMutation = useCreatePostMutation();
  const {
    isPostMutating,
    handleToggleLike,
    handleToggleRetweet,
    handleToggleBookmark,
    handleUpdatePost,
    handleDeletePost,
  } = usePostCardActions();
  const [composerOpen, setComposerOpen] = useState(false);
  const username = meQuery.data?.username ?? "guest";
  const sidebarUser = getSidebarUser(meQuery.data, {
    name: username,
    handle: username,
    avatarAlt: username,
  });
  const profilePath = meQuery.data?.username
    ? `/profile/${meQuery.data.username}`
    : "/feed";
  const routeKey = getRouteScrollKey(location.pathname, location.search);

  useEffect(() => {
    if (restoredRouteRef.current === routeKey) return;
    restoredRouteRef.current = routeKey;
    restoreRouteScroll(routeKey);
  }, [routeKey]);

  const isRefreshing =
    bookmarksQuery.isFetching && bookmarksQuery.isPlaceholderData;

  const handleHomeClick = useCallback(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

  const handleCreatePost = async (content: string, mediaId: number | null) => {
    const payload = mediaId ? { content, media_id: mediaId } : { content };
    try {
      await createPostMutation.mutateAsync(payload);
      toast.success("Posted");
      return true;
    } catch (e) {
      const error = e as ApiError;
      toast.error(error.message);
      return false;
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <>
      <AlertDialog>
        <AppShell
          sidebar={
            <AppSidebar
              user={sidebarUser}
              activeItem="bookmarks"
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
          <PageHeader
            title="Bookmarks"
            subtitle="Your saved posts, newest first."
          />

          {bookmarksQuery.isPending ? (
            <div className="flex justify-center py-10">
              <Spinner size="lg" />
            </div>
          ) : bookmarksQuery.isError ? (
            <div className="border-destructive/30 bg-destructive/10 rounded-md border p-4 text-center">
              <div className="text-destructive font-medium">
                Couldn't load bookmarks
              </div>
              <div className="text-muted-foreground mt-1 text-sm">
                {bookmarksQuery.error.message}
              </div>
              <Button
                className="mt-3"
                variant="outline"
                onClick={() => bookmarksQuery.refetch()}
              >
                Retry
              </Button>
            </div>
          ) : bookmarksQuery.data.length ? (
            <div className="space-y-3">
              {bookmarksQuery.data.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  pending={isPostMutating(post.id)}
                  isOwner={meQuery.data?.id === post.owner_id}
                  onToggleLike={handleToggleLike}
                  onToggleRetweet={handleToggleRetweet}
                  onToggleBookmark={handleToggleBookmark}
                  onUpdate={handleUpdatePost}
                  onDelete={handleDeletePost}
                />
              ))}
            </div>
          ) : (
            <div className="text-muted-foreground py-8 text-center">
              No bookmarks yet. Save posts to see them here.
            </div>
          )}

          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              disabled={page === 0 || bookmarksQuery.isFetching}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              Previous
            </Button>
            <div className="text-muted-foreground text-sm flex items-center gap-2">
              <span>Page {page + 1}</span>
              {isRefreshing ? (
                <div className="inline-flex items-center gap-1">
                  <Spinner
                    size="sm"
                    label={`Refreshing\u2026`}
                    className="inline-block"
                  />
                  <span>{`Refreshing\u2026`}</span>
                </div>
              ) : null}
            </div>
            <Button
              variant="outline"
              disabled={
                bookmarksQuery.isFetching ||
                (bookmarksQuery.data?.length ?? 0) < limit
              }
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
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
