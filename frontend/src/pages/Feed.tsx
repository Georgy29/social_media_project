import { useCallback, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  IconHome,
  IconSearch,
  IconSettings,
  IconUser,
} from "@tabler/icons-react";

import { CreatePost } from "@/components/CreatePost";
import { Logo } from "@/components/Logo";
import { PostComposerDialog } from "@/components/PostComposerDialog";
import { PostCard } from "@/components/PostCard";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
  const profilePath = meQuery.data?.username
    ? `/profile/${meQuery.data.username}`
    : "/feed";

  const isMutating =
    createPostMutation.isPending ||
    updatePostMutation.isPending ||
    deletePostMutation.isPending ||
    toggleLikeMutation.isPending ||
    toggleRetweetMutation.isPending;
  const isRefreshing = feedQuery.isFetching && feedQuery.isPlaceholderData;

  const handleHomeClick = useCallback(() => {
    setPage(0);
    feedQuery.refetch();
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [feedQuery]);

  const handleCreatePost = async (
    content: string,
    mediaId: number | null,
  ) => {
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
        <div className="bg-background text-foreground min-h-screen w-full">
          <div className="mx-auto grid w-full max-w-6xl gap-6 p-4 md:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,1fr)_240px]">
            <aside className="md:sticky md:top-4 md:h-[calc(100vh-2rem)]">
              <div className="hidden md:flex h-full flex-col gap-4">
                <div className="border-border bg-card rounded-lg border p-3">
                  <Button
                    className="h-auto w-full justify-start gap-3 px-3 py-2"
                    variant="ghost"
                    aria-label="View profile"
                    onClick={() => navigate(profilePath)}
                  >
                    <Avatar className="size-10">
                      {meQuery.data?.avatar_url ? (
                        <AvatarImage
                          src={meQuery.data.avatar_url}
                          alt={username}
                        />
                      ) : null}
                      <AvatarFallback className="text-sm font-semibold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-left">
                      <div className="text-sm font-semibold">{username}</div>
                      <div className="text-muted-foreground text-xs">
                        @{username}
                      </div>
                    </div>
                  </Button>
                </div>
                <nav className="border-border bg-card rounded-lg border p-3">
                  <Button
                    className="w-full justify-start gap-2"
                    variant="secondary"
                    onClick={handleHomeClick}
                  >
                    <IconHome className="h-5 w-5" aria-hidden="true" />
                    Feed
                  </Button>
                  <Button
                    className="mt-2 w-full justify-start gap-2"
                    variant="ghost"
                    onClick={() => navigate(profilePath)}
                  >
                    <IconUser className="h-5 w-5" aria-hidden="true" />
                    Profile
                  </Button>
                  <Button
                    className="mt-2 w-full justify-start gap-2"
                    variant="ghost"
                  >
                    <IconSearch className="h-5 w-5" aria-hidden="true" />
                    Search
                  </Button>
                  <div className="mt-3 border-t border-border pt-2">
                    <Button
                      className="w-full justify-start gap-2"
                      variant="ghost"
                    >
                      <IconSettings className="h-5 w-5" aria-hidden="true" />
                      Settings
                    </Button>
                  </div>
                </nav>
                <Button
                  className="w-full"
                  variant="default"
                  size="default"
                  onClick={() => setComposerOpen(true)}
                >
                  Post
                </Button>
                <AlertDialogTrigger asChild>
                  <Button className="mt-auto w-full" variant="outline">
                    Logout
                  </Button>
                </AlertDialogTrigger>
              </div>
            </aside>

            <main className="space-y-4">
              <div className="flex justify-center">
                <Button
                  variant="ghost"
                  className="h-auto px-2"
                  onClick={handleHomeClick}
                  aria-label="Go to feed"
                >
                  <Logo size="md" name="Social" />
                </Button>
              </div>
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
                <TabsList className="w-full">
                  <TabsTrigger value="public">Public feed</TabsTrigger>
                  <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
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
                      pending={isMutating}
                      isOwner={meQuery.data?.id === post.owner_id}
                      onToggleLike={(p) =>
                        toggleLikeMutation.mutate({
                          postId: p.id,
                          isLiked: p.is_liked,
                        })
                      }
                      onToggleRetweet={(p) =>
                        toggleRetweetMutation.mutate(
                          {
                            postId: p.id,
                            isRetweeted: p.is_retweeted,
                          },
                          {
                            onSuccess: () => {
                              toast.success(
                                p.is_retweeted
                                  ? "Repost removed"
                                  : "Reposted",
                              );
                            },
                            onError: (e: ApiError) => {
                              toast.error(e.message);
                            },
                          },
                        )
                      }
                      onUpdate={async (postId, content) => {
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
                      }}
                      onDelete={async (postId) => {
                        try {
                          await deletePostMutation.mutateAsync({ postId });
                          toast.success("Deleted");
                        } catch (e) {
                          const error = e as ApiError;
                          toast.error(error.message);
                          throw e;
                        }
                      }}
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
            </main>

            <aside className="xl:sticky xl:top-4 xl:h-[calc(100vh-2rem)] hidden xl:block">
              <div className="flex flex-col gap-4">
                <SidebarCard title="Search">
                  <div className="text-muted-foreground text-sm">
                    Find people or topics.
                  </div>
                </SidebarCard>
                <SidebarCard title="Trends">
                  <ul className="text-muted-foreground space-y-2 text-sm">
                    <li>#fastapi</li>
                    <li>#react</li>
                    <li>#shadcn</li>
                  </ul>
                </SidebarCard>
                <SidebarCard title="Who to follow">
                  <ul className="text-muted-foreground space-y-2 text-sm">
                    <li>@frontendwizard</li>
                    <li>@backendhero</li>
                    <li>@productmind</li>
                  </ul>
                </SidebarCard>
                <SidebarCard title="Build notes">
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="made">
                      <AccordionTrigger>How was this made?</AccordionTrigger>
                      <AccordionContent>
                        <ul className="space-y-1">
                          <li>shadcn UI + Radix UI</li>
                          <li>Animate UI components</li>
                          <li>React + Vite + TypeScript</li>
                          <li>Tailwind CSS + Sonner</li>
                          <li>FastAPI backend + TanStack Query</li>
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="next">
                      <AccordionTrigger>What can I do?</AccordionTrigger>
                      <AccordionContent>
                        <ul className="space-y-1">
                          <li>Post, edit, like, repost, and bookmark</li>
                          <li>Filter public vs subscriptions feed</li>
                          <li>Open the composer for richer posts</li>
                          <li>Follow people and explore trends</li>
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </SidebarCard>
              </div>
            </aside>
          </div>
        </div>

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

type SidebarCardProps = {
  title: string;
  children: ReactNode;
};

function SidebarCard({ title, children }: SidebarCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="text-sm font-semibold">{title}</div>
      </CardHeader>
      <CardContent className="text-sm">{children}</CardContent>
    </Card>
  );
}
