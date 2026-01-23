import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/animate-ui/components/radix/hover-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  useMeQuery,
  useToggleFollowMutation,
  useUserProfileQuery,
} from "@/api/queries";

type ProfileHoverCardProps = {
  username: string;
  userId: number;
  avatarUrl?: string | null;
  children: ReactNode;
};

export function ProfileHoverCard({
  username,
  userId,
  avatarUrl,
  children,
}: ProfileHoverCardProps) {
  const [open, setOpen] = useState(false);
  const meQuery = useMeQuery();
  const profileQuery = useUserProfileQuery(username, {
    enabled: open,
    staleTime: 60_000,
  });
  const toggleFollowMutation = useToggleFollowMutation();

  const profile = profileQuery.data;
  const initials = (profile?.username ?? username ?? "?")
    .slice(0, 2)
    .toUpperCase();
  const isOwner = meQuery.data?.username === username;
  const isFollowed = profile?.is_followed_by_viewer ?? false;
  const profilePath = `/profile/${encodeURIComponent(
    profile?.username ?? username,
  )}`;

  const handleToggleFollow = async () => {
    if (!profile || toggleFollowMutation.isPending) return;
    try {
      await toggleFollowMutation.mutateAsync({
        userId: profile.id ?? userId,
        username: profile.username,
        isFollowed,
      });
    } catch (error) {
      const message =
        (error as { message?: string })?.message ??
        "Failed to update follow status";
      toast.error(message);
    }
  };

  return (
    <HoverCard
      open={open}
      onOpenChange={setOpen}
      openDelay={200}
      closeDelay={150}
    >
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent>
        {profileQuery.isPending ? (
          <ProfileHoverSkeleton />
        ) : profileQuery.isError ? (
          <div className="text-muted-foreground text-sm">
            {profileQuery.error.message}
          </div>
        ) : profile ? (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <Link
                to={profilePath}
                aria-label={`View profile for @${profile.username}`}
                className="flex items-center gap-3 hover:opacity-80"
              >
                <Avatar className="size-12">
                  {profile.avatar_url || avatarUrl ? (
                    <AvatarImage
                      src={profile.avatar_url ?? avatarUrl ?? undefined}
                      alt={profile.username}
                    />
                  ) : null}
                  <AvatarFallback className="text-sm font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="text-sm font-semibold">@{profile.username}</div>
              </Link>
              {!isOwner ? (
                <Button
                  size="sm"
                  variant={isFollowed ? "secondary" : "default"}
                  disabled={toggleFollowMutation.isPending}
                  onClick={handleToggleFollow}
                >
                  {isFollowed ? "Following" : "Follow"}
                </Button>
              ) : null}
            </div>
            <div className="text-left text-muted-foreground text-sm leading-relaxed">
              {profile.bio?.trim() ? profile.bio : "No bio yet."}
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <span className="font-semibold tabular-nums">
                  {profile.following_count}
                </span>
                <span className="text-muted-foreground">Following</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="font-semibold tabular-nums">
                  {profile.followers_count}
                </span>
                <span className="text-muted-foreground">Followers</span>
              </div>
            </div>
            <Button asChild size="sm" variant="outline" className="w-full">
              <Link to={profilePath}>View Profile</Link>
            </Button>
          </div>
        ) : (
          <div className="text-muted-foreground text-sm">
            Profile unavailable.
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}

function ProfileHoverSkeleton() {
  return (
    <div className="animate-pulse motion-reduce:animate-none space-y-3">
      <div className="flex items-center gap-3">
        <div className="bg-muted h-12 w-12 rounded-full" />
        <div className="space-y-2">
          <div className="bg-muted h-3 w-24 rounded" />
          <div className="bg-muted h-3 w-16 rounded" />
        </div>
      </div>
      <div className="bg-muted h-3 w-full rounded" />
      <div className="bg-muted h-3 w-5/6 rounded" />
      <div className="flex gap-4">
        <div className="bg-muted h-3 w-20 rounded" />
        <div className="bg-muted h-3 w-20 rounded" />
      </div>
    </div>
  );
}
