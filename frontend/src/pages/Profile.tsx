import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  IconArrowLeft,
  IconHome,
  IconSearch,
  IconSettings,
  IconUser,
} from "@tabler/icons-react";

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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { type ApiError } from "@/api/client";
import { uploadMediaFromDevice } from "@/api/mediaUpload";
import {
  useCreatePostMutation,
  useDeletePostMutation,
  useLogout,
  useMeQuery,
  useToggleLikeMutation,
  useToggleRetweetMutation,
  useUpdatePostMutation,
  useUpdateAvatarMutation,
  useUpdateCoverMutation,
  useUserProfileQuery,
  useUserTimelineQuery,
} from "@/api/queries";

export default function ProfilePage() {
  const navigate = useNavigate();
  const logout = useLogout();
  const { username } = useParams();
  const meQuery = useMeQuery();
  const profileQuery = useUserProfileQuery(username);
  const createPostMutation = useCreatePostMutation();
  const updatePostMutation = useUpdatePostMutation();
  const deletePostMutation = useDeletePostMutation();
  const toggleLikeMutation = useToggleLikeMutation();
  const toggleRetweetMutation = useToggleRetweetMutation();
  const updateAvatarMutation = useUpdateAvatarMutation();
  const updateCoverMutation = useUpdateCoverMutation();
  const [composerOpen, setComposerOpen] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [coverBusy, setCoverBusy] = useState(false);
  const [timelineFilter, setTimelineFilter] = useState<
    "all" | "posts" | "retweets"
  >("all");
  const [timelinePage, setTimelinePage] = useState(0);
  const timelineLimit = 10;
  const timelineParams = useMemo(
    () => ({ skip: timelinePage * timelineLimit, limit: timelineLimit }),
    [timelinePage, timelineLimit],
  );
  const timelineQuery = useUserTimelineQuery(username, timelineParams);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const profile = profileQuery.data;
  const initials = (profile?.username ?? "?").slice(0, 2).toUpperCase();
  const joinedLabel = useMemo(() => {
    if (!profile?.created_at) return null;
    const ts = new Date(profile.created_at);
    if (Number.isNaN(ts.valueOf())) return null;
    return ts.toLocaleDateString();
  }, [profile?.created_at]);
  const isOwner = Boolean(
    profile?.username && meQuery.data?.username === profile.username,
  );
  const profileAvatarUrl =
    profile?.avatar_url ?? (isOwner ? meQuery.data?.avatar_url : null);
  const profilePath = meQuery.data?.username
    ? `/profile/${meQuery.data.username}`
    : "/feed";

  const isMutating =
    createPostMutation.isPending ||
    updatePostMutation.isPending ||
    deletePostMutation.isPending ||
    toggleLikeMutation.isPending ||
    toggleRetweetMutation.isPending;
  const isTimelineRefreshing =
    timelineQuery.isFetching && timelineQuery.isPlaceholderData;

  const filteredTimeline = useMemo(() => {
    if (!timelineQuery.data) return [];
    if (timelineFilter === "all") return timelineQuery.data;
    return timelineQuery.data.filter((item) => item.type === timelineFilter);
  }, [timelineFilter, timelineQuery.data]);

  useEffect(() => {
    setTimelinePage(0);
    setTimelineFilter("all");
  }, [username]);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const handleGoHome = () => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    navigate("/feed");
  };

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

  const handleAvatarUpload = async (file: File) => {
    setAvatarBusy(true);
    try {
      const uploaded = await uploadMediaFromDevice(file, "avatar");
      await updateAvatarMutation.mutateAsync({ media_id: uploaded.mediaId });
      toast.success("Avatar updated");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Avatar upload failed";
      toast.error(message);
    } finally {
      setAvatarBusy(false);
    }
  };

  const handleCoverUpload = async (file: File) => {
    setCoverBusy(true);
    try {
      const uploaded = await uploadMediaFromDevice(file, "profile_cover");
      await updateCoverMutation.mutateAsync({ media_id: uploaded.mediaId });
      toast.success("Cover updated");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Cover upload failed";
      toast.error(message);
    } finally {
      setCoverBusy(false);
    }
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
                          alt={meQuery.data?.username ?? "Your avatar"}
                        />
                      ) : null}
                      <AvatarFallback className="text-sm font-semibold">
                        {meQuery.data?.username?.slice(0, 2).toUpperCase() ??
                          "ME"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-left">
                      <div className="text-sm font-semibold">
                        {meQuery.data?.username ?? "You"}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        @{meQuery.data?.username ?? "you"}
                      </div>
                    </div>
                  </Button>
                </div>
                <nav className="border-border bg-card rounded-lg border p-3">
                  <Button
                    className="w-full justify-start gap-2"
                    variant="ghost"
                    onClick={handleGoHome}
                  >
                    <IconHome className="h-5 w-5" aria-hidden="true" />
                    Feed
                  </Button>
                  <Button
                    className="mt-2 w-full justify-start gap-2"
                    variant="secondary"
                    onClick={() => navigate(profilePath)}
                  >
                    <IconUser className="h-5 w-5" aria-hidden="true" />
                    Profile
                  </Button>
                  <Button
                    className="mt-2 w-full justify-start gap-2"
                    variant="ghost"
                    disabled
                  >
                    <IconSearch className="h-5 w-5" aria-hidden="true" />
                    Search
                  </Button>
                  <div className="mt-3 border-t border-border pt-2">
                    <Button
                      className="w-full justify-start gap-2"
                      variant="ghost"
                      disabled
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
                  onClick={handleGoHome}
                  aria-label="Go to feed"
                >
                  <Logo size="md" name="Social" />
                </Button>
              </div>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={handleGoHome}
                    aria-label="Back to feed"
                  >
                    <IconArrowLeft className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <div className="text-xl font-semibold">Profile</div>
                </div>
                <div className="flex items-center gap-2 md:hidden">
                  <Button onClick={() => setComposerOpen(true)}>Post</Button>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline">Logout</Button>
                  </AlertDialogTrigger>
                </div>
              </div>

              {!username ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Missing username</CardTitle>
                  </CardHeader>
                  <CardContent className="text-muted-foreground">
                    No profile was selected. Head back to the feed and try
                    again.
                  </CardContent>
                </Card>
              ) : profileQuery.isPending ? (
                <ProfileSkeleton />
              ) : profileQuery.isError ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Profile unavailable</CardTitle>
                  </CardHeader>
                  <CardContent className="text-muted-foreground">
                    {profileQuery.error.message}
                  </CardContent>
                </Card>
              ) : profile ? (
                <Card>
                  <div className="relative">
                    {profile.cover_url ? (
                      <img
                        src={profile.cover_url}
                        alt={`${profile.username} cover`}
                        className="h-40 w-full object-cover sm:h-48"
                        loading="lazy"
                      />
                    ) : (
                      <div className="bg-muted h-40 w-full sm:h-48" />
                    )}
                    {isOwner ? (
                      <div className="absolute right-3 top-3">
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={coverBusy}
                          onClick={() => coverInputRef.current?.click()}
                        >
                          {coverBusy ? "Uploading..." : "Change cover"}
                        </Button>
                      </div>
                    ) : null}
                  </div>
                  <CardContent className="relative -mt-10 space-y-4 pb-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                      <div className="flex items-end gap-3">
                        <Avatar className="size-20 ring-4 ring-background">
                          {profileAvatarUrl ? (
                            <AvatarImage
                              src={profileAvatarUrl}
                              alt={profile.username}
                            />
                          ) : null}
                          <AvatarFallback className="text-lg font-semibold">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="space-y-1">
                          <div className="text-lg font-semibold">
                            @{profile.username}
                          </div>
                          {joinedLabel ? (
                            <div className="text-muted-foreground text-sm">
                              Member since {joinedLabel}
                            </div>
                          ) : null}
                        </div>
                      </div>
                      {isOwner ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={avatarBusy}
                            onClick={() => avatarInputRef.current?.click()}
                          >
                            {avatarBusy ? "Uploading..." : "Change avatar"}
                          </Button>
                        </div>
                      ) : null}
                    </div>
                    <Separator />
                    <div className="grid gap-3 sm:grid-cols-3">
                      <StatCard
                        label="Followers"
                        value={profile.followers_count}
                      />
                      <StatCard
                        label="Following"
                        value={profile.following_count}
                      />
                      <StatCard label="Posts" value={profile.posts_count} />
                    </div>
                  </CardContent>
                </Card>
              ) : null}

              <Card>
                <CardHeader className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle>Timeline</CardTitle>
                    {isTimelineRefreshing ? (
                      <div className="text-muted-foreground text-xs">
                        Refreshing...
                      </div>
                    ) : null}
                  </div>
                  <Tabs
                    value={timelineFilter}
                    onValueChange={(value) =>
                      setTimelineFilter(value as "all" | "posts" | "retweets")
                    }
                    className="border-border bg-card rounded-lg border p-1"
                  >
                    <TabsList className="w-full">
                      <TabsTrigger value="all">All</TabsTrigger>
                      <TabsTrigger value="posts">Posts</TabsTrigger>
                      <TabsTrigger value="retweets">Reposts</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </CardHeader>
                <CardContent className="space-y-3">
                  {!username ? (
                    <div className="text-muted-foreground text-sm">
                      Select a profile to view their posts.
                    </div>
                  ) : timelineQuery.isPending ? (
                    <TimelineSkeleton />
                  ) : timelineQuery.isError ? (
                    <div className="text-muted-foreground text-sm">
                      {timelineQuery.error.message}
                    </div>
                  ) : timelineQuery.data.length ? (
                    filteredTimeline.length ? (
                      <div className="space-y-4">
                        {filteredTimeline.map((item) => {
                          const repostedLabel = item.reposted_at
                            ? new Date(item.reposted_at).toLocaleString()
                            : null;
                          return (
                            <div
                              key={`${item.type}-${item.activity_at}-${item.post.id}`}
                              className="space-y-2"
                            >
                              {item.type === "retweets" ? (
                                <div className="text-muted-foreground flex items-center gap-2 text-xs">
                                  <Badge variant="secondary">Reposted</Badge>
                                  {repostedLabel ? (
                                    <span>{repostedLabel}</span>
                                  ) : null}
                                </div>
                              ) : null}
                              <PostCard
                                post={item.post}
                                pending={isMutating}
                                isOwner={
                                  meQuery.data?.id === item.post.owner_id
                                }
                                onToggleLike={(post) =>
                                  toggleLikeMutation.mutate({
                                    postId: post.id,
                                    isLiked: post.is_liked,
                                  })
                                }
                                onToggleRetweet={(post) =>
                                  toggleRetweetMutation.mutate(
                                    {
                                      postId: post.id,
                                      isRetweeted: post.is_retweeted,
                                    },
                                    {
                                      onSuccess: () => {
                                        toast.success(
                                          post.is_retweeted
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
                                    await deletePostMutation.mutateAsync({
                                      postId,
                                    });
                                    toast.success("Deleted");
                                  } catch (e) {
                                    const error = e as ApiError;
                                    toast.error(error.message);
                                    throw e;
                                  }
                                }}
                              />
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-muted-foreground text-sm">
                        No activity matches this filter.
                      </div>
                    )
                  ) : (
                    <div className="text-muted-foreground text-sm">
                      No activity yet.
                    </div>
                  )}
                </CardContent>
                <CardFooter className="justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={timelinePage === 0 || timelineQuery.isFetching}
                    onClick={() =>
                      setTimelinePage((value) => Math.max(0, value - 1))
                    }
                  >
                    Previous
                  </Button>
                  <div className="text-muted-foreground text-xs">
                    Page {timelinePage + 1}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={
                      timelineQuery.isFetching ||
                      (timelineQuery.data?.length ?? 0) < timelineLimit
                    }
                    onClick={() => setTimelinePage((value) => value + 1)}
                  >
                    Next
                  </Button>
                </CardFooter>
              </Card>
            </main>

            <aside className="xl:sticky xl:top-4 xl:h-[calc(100vh-2rem)] hidden xl:block">
              <div className="flex flex-col gap-4">
                <SidebarCard title="About">
                  <div className="text-muted-foreground text-sm">
                    Profiles include avatar, cover, and your public stats.
                  </div>
                </SidebarCard>
                <SidebarCard title="Tips">
                  <ul className="text-muted-foreground space-y-2 text-sm">
                    <li>Upload a square avatar for best results.</li>
                    <li>Cover images look great at 3:1.</li>
                    <li>Profile timelines ship next.</li>
                  </ul>
                </SidebarCard>
              </div>
            </aside>
          </div>
        </div>

        <input
          ref={avatarInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            await handleAvatarUpload(file);
            event.target.value = "";
          }}
        />
        <input
          ref={coverInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            await handleCoverUpload(file);
            event.target.value = "";
          }}
        />

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

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card size="sm" className="border-border/70 bg-background">
      <CardContent className="space-y-1 py-3">
        <div className="text-muted-foreground text-xs">{label}</div>
        <div className="text-lg font-semibold tabular-nums">{value}</div>
      </CardContent>
    </Card>
  );
}

function ProfileSkeleton() {
  return (
    <Card className="animate-pulse">
      <div className="bg-muted h-40 w-full sm:h-48" />
      <CardContent className="space-y-4 py-6">
        <div className="flex items-end gap-3">
          <div className="bg-muted h-20 w-20 rounded-full" />
          <div className="space-y-2">
            <div className="bg-muted h-4 w-32 rounded" />
            <div className="bg-muted h-3 w-24 rounded" />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="bg-muted h-16 rounded" />
          <div className="bg-muted h-16 rounded" />
          <div className="bg-muted h-16 rounded" />
        </div>
      </CardContent>
    </Card>
  );
}

function TimelineSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="rounded-xl border border-border p-4">
          <div className="space-y-2">
            <div className="bg-muted h-3 w-28 rounded" />
            <div className="bg-muted h-3 w-full rounded" />
            <div className="bg-muted h-3 w-5/6 rounded" />
            <div className="bg-muted mt-4 h-8 w-24 rounded" />
          </div>
        </div>
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
