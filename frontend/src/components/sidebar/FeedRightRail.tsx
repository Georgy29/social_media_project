import { SidebarCard } from "@/components/sidebar/SidebarCard";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AvatarGroup,
  AvatarGroupTooltip,
} from "@/components/animate-ui/components/animate/avatar-group";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useSuggestionsQuery } from "@/api/queries";
import { Link } from "react-router-dom";

function getAvatarFallback(username: string) {
  const trimmed = username.trim();
  if (!trimmed) return "?";
  return trimmed.slice(0, 2).toUpperCase();
}

export function FeedRightRail() {
  const suggestionsQuery = useSuggestionsQuery({ limit: 5 });
  const suggestions = suggestionsQuery.data?.suggestions ?? [];
  const padded = Array.from({ length: 5 }, (_, i) => suggestions[i] ?? null);

  return (
    <>
      <SidebarCard title="Search">
        <div className="space-y-2 text-sm">
          <div className="text-muted-foreground">Find people or topics.</div>
          <Badge variant="secondary">Coming soon</Badge>
        </div>
      </SidebarCard>
      <SidebarCard title="Trends">
        <ul className="text-muted-foreground space-y-2 text-sm">
          <li>#fastapi</li>
          <li>#react</li>
          <li>#shadcn</li>
        </ul>
      </SidebarCard>
      <SidebarCard title="Who to Follow">
        {suggestionsQuery.isError ? (
          <div className="text-muted-foreground text-sm">
            {suggestionsQuery.error.message}
          </div>
        ) : (
          <AvatarGroup>
            {padded.map((user, index) =>
              user ? (
                <Link
                  key={user.id ?? `${user.username}-${index}`}
                  to={`/profile/${user.username}`}
                  aria-label={`View @${user.username}`}
                  className="block"
                >
                  <Avatar className="size-11 border-2 border-background">
                    <AvatarImage
                      src={user.avatar_url ?? undefined}
                      alt={`@${user.username}`}
                    />
                    <AvatarFallback>
                      {getAvatarFallback(user.username)}
                    </AvatarFallback>
                    <AvatarGroupTooltip>@{user.username}</AvatarGroupTooltip>
                  </Avatar>
                </Link>
              ) : (
                <Avatar
                  key={`placeholder-${index}`}
                  className="size-11 border-2 border-background"
                >
                  <AvatarFallback className="bg-muted/60 text-muted-foreground">
                    {" "}
                  </AvatarFallback>
                </Avatar>
              ),
            )}
          </AvatarGroup>
        )}
      </SidebarCard>
      <SidebarCard title="About This Demo">
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="made">
            <AccordionTrigger>How Was This Made?</AccordionTrigger>
            <AccordionContent>
              <ul className="space-y-1">
                <li>FastAPI + Postgres (Docker Compose + Alembic)</li>
                <li>JWT auth + OpenAPI-generated types</li>
                <li>S3 media uploads via presigned URLs</li>
                <li>React + Vite + TanStack Query + shadcn/ui</li>
              </ul>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="next">
            <AccordionTrigger>What Can I Do?</AccordionTrigger>
            <AccordionContent>
              <ul className="space-y-1">
                <li>Create text or image posts</li>
                <li>Edit/delete your posts (within the edit window)</li>
                <li>Like/repost (and undo)</li>
                <li>Browse public vs subscriptions feed</li>
                <li>Open profiles and follow/unfollow</li>
              </ul>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="planned">
            <AccordionTrigger>{"What\u2019s Next?"}</AccordionTrigger>
            <AccordionContent>
              <ul className="space-y-1">
                <li>Bookmarks: persisted state + a real page</li>
                <li>Search: people and posts</li>
                <li>Profile avatar group: mutuals/suggestions preview</li>
              </ul>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </SidebarCard>
    </>
  );
}
