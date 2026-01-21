import type { SidebarUser } from "@/components/sidebar/AppSidebar";

type MeUser = {
  username?: string | null;
  avatar_url?: string | null;
} | null | undefined;

type SidebarFallback = {
  name: string;
  handle: string;
  avatarAlt: string;
  avatarFallback?: string;
};

export function getSidebarUser(
  me: MeUser,
  fallback: SidebarFallback,
): SidebarUser {
  const name = me?.username ?? fallback.name;
  const handle = me?.username ?? fallback.handle;
  const avatarFallback =
    me?.username?.slice(0, 2).toUpperCase() ??
    fallback.avatarFallback ??
    fallback.name.slice(0, 2).toUpperCase();
  const avatarAlt = me?.username ?? fallback.avatarAlt;

  return {
    name,
    handle,
    avatarUrl: me?.avatar_url ?? null,
    avatarFallback,
    avatarAlt,
  };
}
