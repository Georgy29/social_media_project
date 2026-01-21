import type { ReactNode } from "react";
import {
  IconHome,
  IconSearch,
  IconSettings,
  IconUser,
} from "@tabler/icons-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

type SidebarUser = {
  name: string;
  handle: string;
  avatarUrl?: string | null;
  avatarFallback: string;
  avatarAlt?: string;
};

type AppSidebarProps = {
  user: SidebarUser;
  activeItem: "feed" | "profile";
  onHomeClick: () => void;
  onProfileClick: () => void;
  onCompose: () => void;
  logoutAction: ReactNode;
};

export function AppSidebar({
  user,
  activeItem,
  onHomeClick,
  onProfileClick,
  onCompose,
  logoutAction,
}: AppSidebarProps) {
  const avatarAlt = user.avatarAlt ?? user.name;

  return (
    <>
      <Button
        className="h-auto w-full justify-start gap-3 px-3 py-3 rounded-lg border border-border bg-card hover:bg-muted/50"
        variant="ghost"
        aria-label="View profile"
        onClick={onProfileClick}
      >
        <Avatar className="size-10">
          {user.avatarUrl ? (
            <AvatarImage src={user.avatarUrl} alt={avatarAlt} />
          ) : null}
          <AvatarFallback className="text-sm font-semibold">
            {user.avatarFallback}
          </AvatarFallback>
        </Avatar>
        <div className="text-left">
          <div className="text-base font-semibold">{user.name}</div>
          <div className="text-muted-foreground text-sm">@{user.handle}</div>
        </div>
      </Button>
      <nav className="border-border bg-card rounded-lg border p-2">
        <Button
          className="w-full justify-start gap-4 h-12 text-base font-medium px-4"
          variant={activeItem === "feed" ? "secondary" : "ghost"}
          onClick={onHomeClick}
        >
          <IconHome className="h-6 w-6" aria-hidden="true" />
          Feed
        </Button>
        <Button
          className="mt-1 w-full justify-start gap-4 h-12 text-base font-medium px-4"
          variant={activeItem === "profile" ? "secondary" : "ghost"}
          onClick={onProfileClick}
        >
          <IconUser className="h-6 w-6" aria-hidden="true" />
          Profile
        </Button>
        <Button
          className="mt-1 w-full justify-start gap-4 h-12 text-base font-medium px-4"
          variant="ghost"
          disabled
        >
          <IconSearch className="h-6 w-6" aria-hidden="true" />
          Search
        </Button>
        <div className="mt-2 border-t border-border pt-2">
          <Button
            className="w-full justify-start gap-4 h-12 text-base font-medium px-4"
            variant="ghost"
            disabled
          >
            <IconSettings className="h-6 w-6" aria-hidden="true" />
            Settings
          </Button>
        </div>
      </nav>
      <Button
        className="w-full"
        variant="default"
        size="default"
        onClick={onCompose}
      >
        Post
      </Button>
      <div className="mt-auto">{logoutAction}</div>
    </>
  );
}
