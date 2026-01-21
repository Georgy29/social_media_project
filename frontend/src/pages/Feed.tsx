import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { CreatePost } from "@/components/CreatePost";
import { PostComposerDialog } from "@/components/PostComposerDialog";
import { PostCard, type PostWithCounts } from "@/components/PostCard";
import { AppShell } from "@/components/layout/AppShell";
import { BrandHeader } from "@/components/layout/BrandHeader";
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
} from "@/components/animate-ui/components/radix/alert-dialog";
import { AppSidebar } from "@/components/sidebar/AppSidebar";
import { FeedRightRail } from "@/components/sidebar/FeedRightRail";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { type ApiError } from "@/api/client";
import {
  useCreatePostMutation,
  useDeletePostMutation,
  useFeedQuery,
  useLogout,
  useMeQuery,
  useToggleLikeMutation,
  useToggleRetweetMutation,
  useUpdatePostMutation,
} from "@/api/queries";

type FeedView = "public" | "subscriptions";

export default function FeedPage() {
  const navigate = useNavigate();
  const logout = useLogout();
  const meQuery = useMeQuery();

  const [page, setPage] = useState(0);
  const [feedView, setFeedView] = useState<FeedView>("public");
  const limit = 10;
  const params = useMemo(
    () => ({ skip: page * limit, limit, view: feedView }),
    [page, limit, feedView],
  );

  const feedQuery = useFeedQuery(params);
  const createPostMutation = useCreatePostMutation();
  const updatePostMutation = useUpdatePostMutation();
  const deletePostMutation = useDeletePostMutation();
  const toggleLikeMutation = useToggleLikeMutation();
  const toggleRetweetMutation = useToggleRetweetMutation();
  const [composerOpen, setComposerOpen] = useState(false);
  const username = meQuery.data?.username ?? "guest";
  const initials = username.slice(0, 2).toUpperCase();
  const sidebarUser = {
    name: username,
    handle: username,
    avatarUrl: meQuery.data?.avatar_url ?? null,
    avatarFallback: initials,
    avatarAlt: username,
  };
  const profilePath = meQuery.data?.username
    ? `/profile/${meQuery.data.username}`
    : "/feed";

  const isRefreshing = feedQuery.isFetching && feedQuery.isPlaceholderData;

  const handleHomeClick = useCallback(() => {
    setPage(0);
    feedQuery.refetch();
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [feedQuery]);

  const isPostMutating = useCallback(
    (postId: number) =>
      (updatePostMutation.isPending &&
        updatePostMutation.variables?.postId === postId) ||
      (deletePostMutation.isPending &&
        deletePostMutation.variables?.postId === postId) ||
      (toggleLikeMutation.isPending &&
        toggleLikeMutation.variables?.postId === postId) ||
      (toggleRetweetMutation.isPending &&
        toggleRetweetMutation.variables?.postId === postId),
    [
      updatePostMutation.isPending,
      updatePostMutation.variables?.postId,
      deletePostMutation.isPending,
      deletePostMutation.variables?.postId,
      toggleLikeMutation.isPending,
      toggleLikeMutation.variables?.postId,
      toggleRetweetMutation.isPending,
      toggleRetweetMutation.variables?.postId,
    ],
  );

  const handleToggleLike = useCallback(
    (post: PostWithCounts) => {
      toggleLikeMutation.mutate({ postId: post.id, isLiked: post.is_liked });
    },
    [toggleLikeMutation],
  );

  const handleToggleRetweet = useCallback(
    (post: PostWithCounts) => {
      toggleRetweetMutation.mutate(
        { postId: post.id, isRetweeted: post.is_retweeted },
        {
          onSuccess: () => {
            toast.success(post.is_retweeted ? "Repost removed" : "Reposted");
          },
          onError: (e: ApiError) => {
            toast.error(e.message);
          },
        },
      );
    },
    [toggleRetweetMutation],
  );

  const handleUpdatePost = useCallback(
    async (postId: number, content: string) => {
      try {
        await updatePostMutation.mutateAsync({
          postId,
          payload: { content },
        });
        toast.success("Updated");
      } catch (e) {
        const error = e as ApiError;
        toast.error(error.message);
        throw e;
      }
    },
    [updatePostMutation],
  );

  const handleDeletePost = useCallback(
    async (postId: number) => {
      try {
        await deletePostMutation.mutateAsync({ postId });
        toast.success("Deleted");
      } catch (e) {
        const error = e as ApiError;
        toast.error(error.message);
        throw e;
      }
    },
    [deletePostMutation],
  );

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
              activeItem="feed"
              onHomeClick={handleHomeClick}
              onProfileClick={() => navigate(profilePath)}
              onCompose={() => setComposerOpen(true)}
              logoutAction={
                <AlertDialogTrigger asChild>
                  <Button className="w-full" variant="outline">
                    Logout
                  </Button>
                </AlertDialogTrigger>
              }
            />
          }
          rightRail={<FeedRightRail />}
        >
          <BrandHeader onClick={handleHomeClick} />
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="text-xl font-semibold">Feed</div>
              <div className="text-muted-foreground text-sm">
                {meQuery.data
                  ? `Hello @${meQuery.data.username} feel free to try out my social media MVP`
                  : null}
              </div>
            </div>
            <div className="flex items-center gap-2 md:hidden">
              <Button onClick={() => setComposerOpen(true)}>Post</Button>
              <AlertDialogTrigger asChild>
                <Button variant="outline">Logout</Button>
              </AlertDialogTrigger>
            </div>
          </div>

          <Tabs
            value={feedView}
            onValueChange={(value) => {
              setFeedView(value as FeedView);
              setPage(0);
            }}
            className="border-border bg-card rounded-lg border p-1"
          >
            <TabsList className="w-full h-auto">
              <TabsTrigger value="public" className="h-10 text-base px-4">
                Public feed
              </TabsTrigger>
              <TabsTrigger value="subscriptions" className="h-10 text-base px-4">
                Subscriptions
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <CreatePost
            pending={createPostMutation.isPending}
            onCreate={(content) => {
              void handleCreatePost(content, null);
            }}
          />

          {feedQuery.isPending ? (
            <FeedSkeleton />
          ) : feedQuery.isError ? (
            <div className="border-destructive/30 bg-destructive/10 rounded-md border p-4 text-center">
              <div className="text-destructive font-medium">
                Couldn't load feed
              </div>
              <div className="text-muted-foreground mt-1 text-sm">
                {feedQuery.error.message}
              </div>
              <Button
                className="mt-3"
                variant="outline"
                onClick={() => feedQuery.refetch()}
              >
                Retry
              </Button>
            </div>
          ) : feedQuery.data.length ? (
            <div className="space-y-3">
              {feedQuery.data.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  pending={isPostMutating(post.id)}
                  isOwner={meQuery.data?.id === post.owner_id}
                  onToggleLike={handleToggleLike}
                  onToggleRetweet={handleToggleRetweet}
                  onUpdate={handleUpdatePost}
                  onDelete={handleDeletePost}
                />
              ))}
            </div>
          ) : (
            <div className="text-muted-foreground py-8 text-center">
              No posts yet. Create your first post above.
            </div>
          )}

          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              disabled={page === 0 || feedQuery.isFetching}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              Previous
            </Button>
            <div className="text-muted-foreground text-sm">
              Page {page + 1}
              {isRefreshing ? " - Refreshing..." : ""}
            </div>
            <Button
              variant="outline"
              disabled={
                feedQuery.isFetching ||
                (feedQuery.data?.length ?? 0) < limit
              }
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </AppShell>

        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Log out?</AlertDialogTitle>
            <AlertDialogDescription>
              You will need to sign in again to continue.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout}>Logout</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
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

function FeedSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={index} className="animate-pulse">
          <CardHeader className="space-y-2">
            <div className="bg-muted h-4 w-32 rounded" />
            <div className="bg-muted h-3 w-24 rounded" />
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="bg-muted h-3 w-full rounded" />
            <div className="bg-muted h-3 w-5/6 rounded" />
            <div className="mt-4 flex gap-2">
              <div className="bg-muted h-8 w-20 rounded" />
              <div className="bg-muted h-8 w-20 rounded" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
