import { SidebarCard } from "@/components/sidebar/SidebarCard";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export function FeedRightRail() {
  return (
    <>
      <SidebarCard title="Search">
        <div className="text-muted-foreground text-sm">
          Find people or topics.
        </div>
      </SidebarCard>
      <SidebarCard title="Trends">
        <ul className="text-muted-foreground space-y-2 text-sm">
          <li>#fastapi</li>
          <li>#react</li>
          <li>#shadcn</li>
        </ul>
      </SidebarCard>
      <SidebarCard title="Who to follow">
        <ul className="text-muted-foreground space-y-2 text-sm">
          <li>@frontendwizard</li>
          <li>@backendhero</li>
          <li>@productmind</li>
        </ul>
      </SidebarCard>
      <SidebarCard title="Build notes">
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="made">
            <AccordionTrigger>How was this made?</AccordionTrigger>
            <AccordionContent>
              <ul className="space-y-1">
                <li>shadcn UI + Radix UI</li>
                <li>Animate UI components</li>
                <li>React + Vite + TypeScript</li>
                <li>Tailwind CSS + Sonner</li>
                <li>FastAPI backend + TanStack Query</li>
              </ul>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="next">
            <AccordionTrigger>What can I do?</AccordionTrigger>
            <AccordionContent>
              <ul className="space-y-1">
                <li>Post, edit, like, repost, and bookmark</li>
                <li>Filter public vs subscriptions feed</li>
                <li>Open the composer for richer posts</li>
                <li>Follow people and explore trends</li>
              </ul>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </SidebarCard>
    </>
  );
}
