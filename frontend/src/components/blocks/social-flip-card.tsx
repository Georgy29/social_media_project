import { IconBrandGithub, IconBrandLinkedin } from "@tabler/icons-react";

import { FlipCard } from "@/components/animate-ui/flip-card";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SocialFlipCard({
  className,
  githubUrl = "https://github.com/",
  linkedinUrl = "https://www.linkedin.com/",
}: {
  className?: string;
  githubUrl?: string;
  linkedinUrl?: string;
}) {
  return (
    <FlipCard
      className={cn("h-full w-full cursor-pointer", className)}
      front={
        <div className="bg-background/70 text-foreground flex h-full w-full items-center justify-center overflow-hidden rounded-none backdrop-blur">
          <Logo size="xl" className="flex-col gap-3" />
        </div>
      }
      back={
        <div className="bg-background/80 text-foreground flex h-full w-full flex-col items-center justify-center gap-6 rounded-none p-6 backdrop-blur">
          <div className="space-y-1 text-center">
            <p className="text-base font-semibold leading-none">
              Find me online
            </p>
            <p className="text-muted-foreground text-sm">Opens in a new tab</p>
          </div>
          <div className="flex items-center justify-center gap-4">
            <Button
              asChild
              variant="outline"
              size="icon-lg"
              className="size-12 rounded-full hover:border-primary/40 hover:bg-primary/10"
            >
              <a
                href={githubUrl}
                target="_blank"
                rel="noreferrer"
                aria-label="GitHub"
              >
                <IconBrandGithub className="h-6 w-6" aria-hidden="true" />
              </a>
            </Button>
            <Button
              asChild
              variant="outline"
              size="icon-lg"
              className="size-12 rounded-full hover:border-primary/40 hover:bg-primary/10"
            >
              <a
                href={linkedinUrl}
                target="_blank"
                rel="noreferrer"
                aria-label="LinkedIn"
              >
                <IconBrandLinkedin className="h-6 w-6" aria-hidden="true" />
              </a>
            </Button>
          </div>
        </div>
      }
    />
  );
}
