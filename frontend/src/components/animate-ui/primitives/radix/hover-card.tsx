"use client";
/* eslint-disable react-refresh/only-export-components */

import * as React from "react";
import { HoverCard as HoverCardPrimitive } from "radix-ui";
import { AnimatePresence, motion, type HTMLMotionProps } from "motion/react";

import { useControlledState } from "@/hooks/use-controlled-state";
import { getStrictContext } from "@/lib/get-strict-context";
import { cn } from "@/lib/utils";

type HoverCardContextType = {
  isOpen: boolean;
  setIsOpen: HoverCardProps["onOpenChange"];
};

const [HoverCardProvider, useHoverCard] =
  getStrictContext<HoverCardContextType>("HoverCardContext");

type HoverCardProps = React.ComponentProps<typeof HoverCardPrimitive.Root>;

function HoverCard(props: HoverCardProps) {
  const [isOpen, setIsOpen] = useControlledState({
    value: props?.open,
    defaultValue: props?.defaultOpen,
    onChange: props?.onOpenChange,
  });

  return (
    <HoverCardProvider value={{ isOpen, setIsOpen }}>
      <HoverCardPrimitive.Root
        data-slot="hover-card"
        {...props}
        onOpenChange={setIsOpen}
      />
    </HoverCardProvider>
  );
}

type HoverCardTriggerProps = React.ComponentProps<
  typeof HoverCardPrimitive.Trigger
>;

function HoverCardTrigger(props: HoverCardTriggerProps) {
  return (
    <HoverCardPrimitive.Trigger data-slot="hover-card-trigger" {...props} />
  );
}

type HoverCardPortalProps = Omit<
  React.ComponentProps<typeof HoverCardPrimitive.Portal>,
  "forceMount"
>;

function HoverCardPortal(props: HoverCardPortalProps) {
  const { isOpen } = useHoverCard();

  return (
    <AnimatePresence>
      {isOpen && (
        <HoverCardPrimitive.Portal
          data-slot="hover-card-portal"
          forceMount
          {...props}
        />
      )}
    </AnimatePresence>
  );
}

type HoverCardContentProps = Omit<
  React.ComponentProps<typeof HoverCardPrimitive.Content>,
  "forceMount" | "asChild"
> &
  HTMLMotionProps<"div">;

function HoverCardContent({
  transition = { type: "spring", stiffness: 300, damping: 25 },
  side,
  sideOffset,
  align,
  alignOffset,
  className,
  ...props
}: HoverCardContentProps) {
  const { isOpen } = useHoverCard();

  return (
    <HoverCardPrimitive.Content
      asChild
      forceMount
      side={side}
      sideOffset={sideOffset}
      align={align}
      alignOffset={alignOffset}
    >
      <motion.div
        key="hover-card-content"
        data-slot="hover-card-content"
        initial={{ opacity: 0, scale: 0.96, y: 6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 6 }}
        transition={transition}
        className={cn(className, !isOpen && "pointer-events-none")}
        {...props}
      />
    </HoverCardPrimitive.Content>
  );
}

export {
  HoverCard,
  HoverCardPortal,
  HoverCardTrigger,
  HoverCardContent,
  useHoverCard,
  type HoverCardProps,
  type HoverCardTriggerProps,
  type HoverCardPortalProps,
  type HoverCardContentProps,
  type HoverCardContextType,
};
