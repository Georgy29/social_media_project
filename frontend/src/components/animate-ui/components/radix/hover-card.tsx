import * as React from "react";

import {
  HoverCard as HoverCardPrimitive,
  HoverCardContent as HoverCardContentPrimitive,
  HoverCardPortal as HoverCardPortalPrimitive,
  HoverCardTrigger as HoverCardTriggerPrimitive,
  type HoverCardProps as HoverCardPrimitiveProps,
  type HoverCardContentProps as HoverCardContentPrimitiveProps,
  type HoverCardTriggerProps as HoverCardTriggerPrimitiveProps,
} from "@/components/animate-ui/primitives/radix/hover-card";
import { cn } from "@/lib/utils";

type HoverCardProps = HoverCardPrimitiveProps;

function HoverCard(props: HoverCardProps) {
  return <HoverCardPrimitive {...props} />;
}

type HoverCardTriggerProps = HoverCardTriggerPrimitiveProps;

function HoverCardTrigger(props: HoverCardTriggerProps) {
  return <HoverCardTriggerPrimitive {...props} />;
}

type HoverCardContentProps = HoverCardContentPrimitiveProps;

function HoverCardContent({
  className,
  align = "center",
  sideOffset = 8,
  ...props
}: HoverCardContentProps) {
  return (
    <HoverCardPortalPrimitive>
      <HoverCardContentPrimitive
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "bg-popover text-popover-foreground ring-foreground/10 z-50 w-80 rounded-xl border border-border p-4 shadow-lg outline-hidden",
          className,
        )}
        {...props}
      />
    </HoverCardPortalPrimitive>
  );
}

export { HoverCard, HoverCardTrigger, HoverCardContent };
