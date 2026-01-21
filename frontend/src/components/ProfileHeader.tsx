import type { components } from "@/api/types";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type UserProfile = components["schemas"]["UserProfile"];

type ProfileHeaderProps = {
  profile: UserProfile;
  avatarUrl?: string | null;
  joinedLabel?: string | null;
  isOwner: boolean;
  onEditProfile?: () => void;
  showFollowButton?: boolean;
  isFollowed?: boolean;
  followPending?: boolean;
  onToggleFollow?: () => void;
};

export function ProfileHeader({
  profile,
  avatarUrl,
  joinedLabel,
  isOwner,
  onEditProfile,
  showFollowButton = false,
  isFollowed = false,
  followPending = false,
  onToggleFollow,
}: ProfileHeaderProps) {
  const initials = (profile.username ?? "?").slice(0, 2).toUpperCase();

  return (
    <Card className="mb-1.5 h-[380px] !pt-[1px] !pb-[1px]">
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
              size="default"
              variant="outline"
              className="bg-background/80 backdrop-blur-sm hover:bg-background/90"
              onClick={onEditProfile}
            >
              Edit profile
            </Button>
          </div>
        ) : null}
      </div>
      <CardContent className="relative -mt-10 space-y-4 pb-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-end gap-3">
            <Avatar className="size-20 ring-4 ring-background">
              {avatarUrl ? (
                <AvatarImage src={avatarUrl} alt={profile.username} />
              ) : null}
              <AvatarFallback className="text-lg font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1 pt-10">
              <div className="text-lg font-semibold">@{profile.username}</div>
              {joinedLabel ? (
                <div className="text-muted-foreground text-sm">
                  Member since {joinedLabel}
                </div>
              ) : null}
            </div>
          </div>
          {showFollowButton ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="default"
                variant={isFollowed ? "secondary" : "default"}
                disabled={followPending}
                onClick={onToggleFollow}
              >
                {isFollowed ? "Following" : "Follow"}
              </Button>
            </div>
          ) : null}
        </div>
        <div className="text-sm leading-relaxed">
          {profile.bio?.trim() ? profile.bio : "No bio yet."}
        </div>
        <Separator />
        <ProfileStatsRow
          posts={profile.posts_count}
          followers={profile.followers_count}
          following={profile.following_count}
        />
      </CardContent>
    </Card>
  );
}

type ProfileStatsRowProps = {
  posts: number;
  followers: number;
  following: number;
};

function ProfileStatsRow({
  posts,
  followers,
  following,
}: ProfileStatsRowProps) {
  return (
    <div className="flex flex-wrap items-center gap-6">
      <ProfileStatItem label="Posts" value={posts} />
      <ProfileStatItem label="Followers" value={followers} />
      <ProfileStatItem label="Following" value={following} />
    </div>
  );
}

function ProfileStatItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col">
      <span className="text-sm font-semibold tabular-nums">{value}</span>
      <span className="text-muted-foreground text-xs">{label}</span>
    </div>
  );
}
