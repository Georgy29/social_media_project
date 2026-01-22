"use client";
/* eslint-disable react-refresh/only-export-components */

import * as React from "react";
import { Tooltip as TooltipPrimitive } from "radix-ui";
import {
  AnimatePresence,
  motion,
  type HTMLMotionProps,
  type Transition,
} from "motion/react";

import { useControlledState } from "@/hooks/use-controlled-state";
import { getStrictContext } from "@/lib/get-strict-context";

type TooltipProviderContextType = {
  openDelay: number;
  closeDelay: number;
  transition: Transition;
};

const [TooltipProviderContext, useTooltipProvider] =
  getStrictContext<TooltipProviderContextType>("TooltipProviderContext");

type TooltipProviderProps = Omit<
  React.ComponentProps<typeof TooltipPrimitive.Provider>,
  "delayDuration"
> & {
  openDelay?: number;
  closeDelay?: number;
  transition?: Transition;
};

function TooltipProvider({
  openDelay = 700,
  closeDelay = 300,
  transition = { type: "spring", stiffness: 300, damping: 35 },
  children,
  ...props
}: TooltipProviderProps) {
  return (
    <TooltipProviderContext value={{ openDelay, closeDelay, transition }}>
      <TooltipPrimitive.Provider delayDuration={openDelay} {...props}>
        {children}
      </TooltipPrimitive.Provider>
    </TooltipProviderContext>
  );
}

type TooltipContextType = {
  isOpen: boolean;
  setIsOpen: TooltipProps["onOpenChange"];
  side: TooltipProps["side"];
  sideOffset: TooltipProps["sideOffset"];
  align: TooltipProps["align"];
  alignOffset: TooltipProps["alignOffset"];
};

const [TooltipContext, useTooltip] =
  getStrictContext<TooltipContextType>("TooltipContext");

type TooltipProps = React.ComponentProps<typeof TooltipPrimitive.Root> & {
  side?: "top" | "bottom" | "left" | "right";
  sideOffset?: number;
  align?: "start" | "center" | "end";
  alignOffset?: number;
};

function Tooltip({
  side = "top",
  sideOffset = 0,
  align = "center",
  alignOffset = 0,
  ...props
}: TooltipProps) {
  const [isOpen, setIsOpen] = useControlledState({
    value: props?.open,
    defaultValue: props?.defaultOpen,
    onChange: props?.onOpenChange,
  });

  return (
    <TooltipContext
      value={{ isOpen, setIsOpen, side, sideOffset, align, alignOffset }}
    >
      <TooltipPrimitive.Root
        data-slot="tooltip"
        {...props}
        onOpenChange={setIsOpen}
      />
    </TooltipContext>
  );
}

type TooltipTriggerProps = React.ComponentProps<
  typeof TooltipPrimitive.Trigger
>;

function TooltipTrigger(props: TooltipTriggerProps) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}

type TooltipPortalProps = Omit<
  React.ComponentProps<typeof TooltipPrimitive.Portal>,
  "forceMount"
>;

function TooltipPortal(props: TooltipPortalProps) {
  const { isOpen } = useTooltip();

  return (
    <AnimatePresence>
      {isOpen && (
        <TooltipPrimitive.Portal
          data-slot="tooltip-portal"
          forceMount
          {...props}
        />
      )}
    </AnimatePresence>
  );
}

type TooltipContentProps = Omit<
  React.ComponentProps<typeof TooltipPrimitive.Content>,
  "forceMount" | "asChild"
> &
  HTMLMotionProps<"div"> & {
    transition?: Transition;
  };

function TooltipContent({
  transition,
  side,
  sideOffset,
  align,
  alignOffset,
  ...props
}: TooltipContentProps) {
  const tooltip = useTooltip();
  const provider = useTooltipProvider();
  const resolvedTransition = transition ?? provider.transition;

  return (
    <TooltipPortal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        asChild
        forceMount
        side={side ?? tooltip.side}
        sideOffset={sideOffset ?? tooltip.sideOffset}
        align={align ?? tooltip.align}
        alignOffset={alignOffset ?? tooltip.alignOffset}
      >
        <motion.div
          key="tooltip-content"
          initial={{ opacity: 0, scale: 0.96, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 6 }}
          transition={resolvedTransition}
          {...props}
        />
      </TooltipPrimitive.Content>
    </TooltipPortal>
  );
}

type TooltipArrowProps = React.ComponentProps<typeof TooltipPrimitive.Arrow> & {
  withTransition?: boolean;
};

function TooltipArrow({ withTransition, ...props }: TooltipArrowProps) {
  void withTransition;
  return <TooltipPrimitive.Arrow data-slot="tooltip-arrow" {...props} />;
}

export {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipPortal,
  TooltipContent,
  TooltipArrow,
  useTooltip,
  useTooltipProvider,
  type TooltipProviderProps,
  type TooltipProps,
  type TooltipTriggerProps,
  type TooltipPortalProps,
  type TooltipContentProps,
  type TooltipArrowProps,
  type TooltipContextType,
  type TooltipProviderContextType,
};
