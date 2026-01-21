import { useCallback, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { IconArrowLeft } from "@tabler/icons-react";

import { PostComposerDialog } from "@/components/PostComposerDialog";
import { PostCard, type PostWithCounts } from "@/components/PostCard";
import { ProfileEditDialog } from "@/components/ProfileEditDialog";
import { ProfileHeader } from "@/components/ProfileHeader";
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
import { ProfileRightRail } from "@/components/sidebar/ProfileRightRail";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { type ApiError } from "@/api/client";
import {
  useCreatePostMutation,
  useDeletePostMutation,
  useLogout,
  useMeQuery,
  useToggleFollowMutation,
  useToggleLikeMutation,
  useToggleRetweetMutation,
  useUpdatePostMutation,
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
  const toggleFollowMutation = useToggleFollowMutation();
  const toggleLikeMutation = useToggleLikeMutation();
  const toggleRetweetMutation = useToggleRetweetMutation();
  const [composerOpen, setComposerOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const profile = profileQuery.data;
  const joinedLabel = (() => {
    if (!profile?.created_at) return null;
    const ts = new Date(profile.created_at);
    if (Number.isNaN(ts.valueOf())) return null;
    return ts.toLocaleDateString();
  })();
  const isOwner = Boolean(
    profile?.username && meQuery.data?.username === profile.username,
  );
  const isFollowedByViewer = profile?.is_followed_by_viewer ?? false;
  const profileAvatarUrl =
    profile?.avatar_url ?? (isOwner ? meQuery.data?.avatar_url : null);
  const profilePath = meQuery.data?.username
    ? `/profile/${meQuery.data.username}`
    : "/feed";
  const sidebarName = meQuery.data?.username ?? "You";
  const sidebarHandle = meQuery.data?.username ?? "you";
  const sidebarFallback = meQuery.data?.username
    ? meQuery.data.username.slice(0, 2).toUpperCase()
    : "ME";
  const sidebarUser = {
    name: sidebarName,
    handle: sidebarHandle,
    avatarUrl: meQuery.data?.avatar_url ?? null,
    avatarFallback: sidebarFallback,
    avatarAlt: meQuery.data?.username ?? "Your avatar",
  };

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

  const handleToggleFollow = useCallback(() => {
    if (!profile) return;
    toggleFollowMutation.mutate({
      userId: profile.id,
      username: profile.username,
      isFollowed: isFollowedByViewer,
    });
  }, [profile, toggleFollowMutation, isFollowedByViewer]);

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
        await deletePostMutation.mutateAsync({
          postId,
        });
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

  return (
    <>
      <AlertDialog>
        <AppShell
          sidebar={
            <AppSidebar
              user={sidebarUser}
              activeItem="profile"
              onHomeClick={handleGoHome}
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
          rightRail={<ProfileRightRail />}
        >
          <BrandHeader onClick={handleGoHome} />
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
                No profile was selected. Head back to the feed and try again.
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
            <ProfileHeader
              profile={profile}
              avatarUrl={profileAvatarUrl}
              joinedLabel={joinedLabel}
              isOwner={isOwner}
              onEditProfile={() => setEditOpen(true)}
              showFollowButton={!isOwner}
              isFollowed={isFollowedByViewer}
              followPending={toggleFollowMutation.isPending}
              onToggleFollow={handleToggleFollow}
            />
          ) : null}

          <ProfileTimelineSection
            key={username ?? "profile"}
            username={username}
            meId={meQuery.data?.id}
            onToggleLike={handleToggleLike}
            onToggleRetweet={handleToggleRetweet}
            onUpdate={handleUpdatePost}
            onDelete={handleDeletePost}
            isPostMutating={isPostMutating}
          />
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
      {profile && isOwner ? (
        <ProfileEditDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          profile={profile}
          avatarUrl={profileAvatarUrl}
        />
      ) : null}
    </>
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
            <div className="bg-muted h-3 w-40 rounded" />
          </div>
        </div>
        <div className="flex gap-4">
          <div className="bg-muted h-3 w-20 rounded" />
          <div className="bg-muted h-3 w-20 rounded" />
          <div className="bg-muted h-3 w-20 rounded" />
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

type ProfileTimelineSectionProps = {
  username?: string;
  meId?: number;
  onToggleLike: (post: PostWithCounts) => void;
  onToggleRetweet: (post: PostWithCounts) => void;
  onUpdate: (postId: number, content: string) => Promise<unknown>;
  onDelete: (postId: number) => Promise<void>;
  isPostMutating: (postId: number) => boolean;
};

function ProfileTimelineSection({
  username,
  meId,
  onToggleLike,
  onToggleRetweet,
  onUpdate,
  onDelete,
  isPostMutating,
}: ProfileTimelineSectionProps) {
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
  const isTimelineRefreshing =
    timelineQuery.isFetching && timelineQuery.isPlaceholderData;

  const filteredTimeline = useMemo(() => {
    if (!timelineQuery.data) return [];
    if (timelineFilter === "all") return timelineQuery.data;
    return timelineQuery.data.filter((item) => item.type === timelineFilter);
  }, [timelineFilter, timelineQuery.data]);

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle>Timeline</CardTitle>
          {isTimelineRefreshing ? (
            <div className="text-muted-foreground text-xs">Refreshing...</div>
          ) : null}
        </div>
        <Tabs
          value={timelineFilter}
          onValueChange={(value) =>
            setTimelineFilter(value as "all" | "posts" | "retweets")
          }
          className="border-border bg-card rounded-lg border p-1"
        >
          <TabsList className="w-full h-auto">
            <TabsTrigger value="all" className="h-10 text-base px-4">
              All
            </TabsTrigger>
            <TabsTrigger value="posts" className="h-10 text-base px-4">
              Posts
            </TabsTrigger>
            <TabsTrigger value="retweets" className="h-10 text-base px-4">
              Reposts
            </TabsTrigger>
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
                        {repostedLabel ? <span>{repostedLabel}</span> : null}
                      </div>
                    ) : null}
                    <PostCard
                      post={item.post}
                      pending={isPostMutating(item.post.id)}
                      isOwner={meId === item.post.owner_id}
                      onToggleLike={onToggleLike}
                      onToggleRetweet={onToggleRetweet}
                      onUpdate={onUpdate}
                      onDelete={onDelete}
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
          <div className="text-muted-foreground text-sm">No activity yet.</div>
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
  );
}
