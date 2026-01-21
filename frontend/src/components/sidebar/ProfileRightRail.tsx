import { SidebarCard } from "@/components/sidebar/SidebarCard";

export function ProfileRightRail() {
  return (
    <>
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
    </>
  );
}
