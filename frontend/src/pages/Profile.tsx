import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { IconArrowLeft } from "@tabler/icons-react";

import { PostComposerDialog } from "@/components/PostComposerDialog";
import { ProfileEditDialog } from "@/components/ProfileEditDialog";
import { ProfileHeader } from "@/components/ProfileHeader";
import { AppShell } from "@/components/layout/AppShell";
import { BrandHeader } from "@/components/layout/BrandHeader";
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
import { usePostCardActions } from "@/hooks/usePostCardActions";

import { type ApiError } from "@/api/client";
import { formatDate } from "@/lib/date";
import { getRouteScrollKey, restoreRouteScroll } from "@/lib/route-scroll";
import {
  useCreatePostMutation,
  useLogout,
  useMeQuery,
  useToggleFollowMutation,
  useUserProfileQuery,
} from "@/api/queries";

export default function ProfilePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const logout = useLogout();
  const { username } = useParams();
  const meQuery = useMeQuery();
  const restoredRouteRef = useRef<string | null>(null);
  const profileQuery = useUserProfileQuery(username);
  const createPostMutation = useCreatePostMutation();
  const toggleFollowMutation = useToggleFollowMutation();
  const {
    isPostMutating,
    handleToggleLike,
    handleToggleRetweet,
    handleToggleBookmark,
    handleUpdatePost,
    handleDeletePost,
  } = usePostCardActions();
  const [composerOpen, setComposerOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const profile = profileQuery.data;
  const joinedLabel = profile?.created_at ? formatDate(profile.created_at) : null;
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
  const routeKey = getRouteScrollKey(location.pathname, location.search);

  useEffect(() => {
    if (restoredRouteRef.current === routeKey) return;
    restoredRouteRef.current = routeKey;
    restoreRouteScroll(routeKey);
  }, [routeKey]);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const handleHomeAction = () => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleGoHome = () => {
    handleHomeAction();
    navigate("/feed");
  };

  const handleToggleFollow = useCallback(() => {
    if (!profile) return;
    toggleFollowMutation.mutate({
      userId: profile.id,
      username: profile.username,
      isFollowed: isFollowedByViewer,
    });
  }, [profile, toggleFollowMutation, isFollowedByViewer]);

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
              homeHref="/feed"
              profileHref={profilePath}
              onHomeClick={handleHomeAction}
              onCompose={() => setComposerOpen(true)}
              logoutAction={<LogoutButton className="w-full" />}
            />
          }
          rightRail={<ProfileRightRail />}
        >
          <BrandHeader onClick={handleHomeAction} />
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
            onToggleBookmark={handleToggleBookmark}
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
