import { useCallback, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { IconArrowLeft } from "@tabler/icons-react";

import { PostComposerDialog } from "@/components/PostComposerDialog";
import { ProfileEditDialog } from "@/components/ProfileEditDialog";
import { ProfileHeader } from "@/components/ProfileHeader";
import { type PostWithCounts } from "@/components/PostCard";
import { AppShell } from "@/components/layout/AppShell";
import { BrandHeader } from "@/components/layout/BrandHeader";
import { HeaderActions } from "@/components/layout/HeaderActions";
import { LogoutDialogContent } from "@/components/layout/LogoutDialogContent";
import { LogoutButton } from "@/components/layout/LogoutButton";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProfileSkeleton } from "@/components/profile/ProfileSkeleton";
import { ProfileTimelineSection } from "@/components/profile/ProfileTimelineSection";
import { AlertDialog } from "@/components/animate-ui/components/radix/alert-dialog";
import { AppSidebar } from "@/components/sidebar/AppSidebar";
import { ProfileRightRail } from "@/components/sidebar/ProfileRightRail";
import { getSidebarUser } from "@/components/sidebar/sidebar-user";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
  const sidebarUser = getSidebarUser(meQuery.data, {
    name: "You",
    handle: "you",
    avatarAlt: "Your avatar",
    avatarFallback: "ME",
  });

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
              logoutAction={<LogoutButton className="w-full" />}
            />
          }
          rightRail={<ProfileRightRail />}
        >
          <BrandHeader onClick={handleGoHome} />
          <PageHeader
            title="Profile"
            leading={
              <Button
                variant="ghost"
                size="icon"
                onClick={handleGoHome}
                aria-label="Back to feed"
              >
                <IconArrowLeft className="h-4 w-4" aria-hidden="true" />
              </Button>
            }
            actions={<HeaderActions onCompose={() => setComposerOpen(true)} />}
          />

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

        <LogoutDialogContent onConfirm={handleLogout} />
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
