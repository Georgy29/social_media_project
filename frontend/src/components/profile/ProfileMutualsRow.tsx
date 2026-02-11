"use client";

import { Link } from "react-router-dom";

import { useMutualsPreviewQuery, useSuggestionsQuery } from "@/api/queries";
import {
  AvatarGroup,
  AvatarGroupTooltip,
} from "@/components/animate-ui/components/animate/avatar-group";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type ProfileMutualsRowProps = {
  username: string;
  isOwner: boolean;
};

function getAvatarFallback(username: string) {
  const trimmed = username.trim();
  if (!trimmed) return "?";
  return trimmed.slice(0, 2).toUpperCase();
}

export function ProfileMutualsRow({
  username,
  isOwner,
}: ProfileMutualsRowProps) {
  const mutualsQuery = useMutualsPreviewQuery(
    username,
    { limit: 5 },
    { enabled: !isOwner },
  );
  const mutualCount = mutualsQuery.data?.mutual_count ?? 0;
  const mutuals = mutualsQuery.data?.mutual_preview ?? [];
  const shouldShowMutuals = mutualsQuery.isSuccess && mutualCount > 0;
  const shouldFetchSuggestions = mutualsQuery.isSuccess && mutualCount === 0;
  const suggestionsQuery = useSuggestionsQuery(
    { limit: 5 },
    { enabled: shouldFetchSuggestions },
  );
  const suggestionsRaw = suggestionsQuery.data?.suggestions ?? [];
  // Profile header shouldn't recommend the profile user itself.
  const suggestions = suggestionsRaw.filter(
    (user) => user.username !== username,
  );
  const users = shouldShowMutuals ? mutuals : suggestions;
  const padded = Array.from({ length: 5 }, (_, i) => users[i] ?? null);
  const label = shouldShowMutuals ? "Followed by" : "Also follow";
  const showCount = shouldShowMutuals && mutualCount > 5;

  if (isOwner || mutualsQuery.isPending || mutualsQuery.isError) {
    return null;
  }

  if (shouldFetchSuggestions && suggestionsQuery.isPending) {
    return null;
  }

  if (shouldFetchSuggestions && suggestionsQuery.isError) {
    return null;
  }

  if (shouldFetchSuggestions && suggestions.length === 0) {
    return null;
  }

  return (
    <div className="ml-auto flex items-center gap-2 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <AvatarGroup
          className={cn(
            "h-8 -space-x-2",
            shouldShowMutuals ? "" : "grayscale opacity-70",
          )}
        >
          {padded.map((user, index) =>
            user ? (
              <Link
                key={user.id ?? `${user.username}-${index}`}
                to={`/profile/${encodeURIComponent(user.username)}`}
                aria-label={`View @${user.username}`}
                className="block"
              >
                <Avatar className="size-8 border-2 border-background">
                  <AvatarImage
                    src={user.avatar_url ?? undefined}
                    alt={`@${user.username}`}
                  />
                  <AvatarFallback className="text-[10px]">
                    {getAvatarFallback(user.username)}
                  </AvatarFallback>
                  <AvatarGroupTooltip>@{user.username}</AvatarGroupTooltip>
                </Avatar>
              </Link>
            ) : (
              <Avatar
                key={`placeholder-${index}`}
                className="size-8 border-2 border-background"
              >
                <AvatarFallback className="bg-muted/60 text-muted-foreground">
                  {" "}
                </AvatarFallback>
              </Avatar>
            ),
          )}
        </AvatarGroup>
        {showCount ? (
          <div className="bg-muted text-muted-foreground flex size-8 items-center justify-center rounded-full border border-border text-[10px] font-semibold">
            +{mutualCount - 5}
          </div>
        ) : null}
      </div>
    </div>
  );
}
