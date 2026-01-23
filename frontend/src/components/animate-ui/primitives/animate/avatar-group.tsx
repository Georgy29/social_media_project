"use client";

import * as React from "react";
import { motion, useReducedMotion, type Transition } from "motion/react";

import { getStrictContext } from "@/lib/get-strict-context";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipArrow,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  type TooltipArrowProps,
  type TooltipContentProps,
} from "@/components/animate-ui/primitives/animate/tooltip";

type AvatarGroupContextType = {
  side: "top" | "bottom" | "left" | "right";
  sideOffset: number;
  align: "start" | "center" | "end";
  alignOffset: number;
  tooltipTransition: Transition;
};

const [AvatarGroupProvider, useAvatarGroup] =
  getStrictContext<AvatarGroupContextType>("AvatarGroupContext");

type AvatarGroupProps = Omit<React.ComponentProps<"div">, "translate"> & {
  children: React.ReactElement[];
  invertOverlap?: boolean;
  translate?: string | number;
  transition?: Transition;
  tooltipTransition?: Transition;
  openDelay?: number;
  closeDelay?: number;
  side?: "top" | "bottom" | "left" | "right";
  sideOffset?: number;
  align?: "start" | "center" | "end";
  alignOffset?: number;
};

type AvatarGroupTooltipProps = Omit<TooltipContentProps, "asChild">;

type AvatarGroupTooltipArrowProps = TooltipArrowProps;

function AvatarGroupTooltip({
  side,
  sideOffset,
  align,
  alignOffset,
  transition,
  className,
  ...props
}: AvatarGroupTooltipProps) {
  const ctx = useAvatarGroup();

  return (
    <TooltipContent
      side={side ?? ctx.side}
      sideOffset={sideOffset ?? ctx.sideOffset}
      align={align ?? ctx.align}
      alignOffset={alignOffset ?? ctx.alignOffset}
      transition={transition ?? ctx.tooltipTransition}
      className={className}
      {...props}
    />
  );
}

AvatarGroupTooltip.displayName = "AvatarGroupTooltip";

function AvatarGroupTooltipArrow(props: AvatarGroupTooltipArrowProps) {
  return <TooltipArrow {...props} />;
}

AvatarGroupTooltipArrow.displayName = "AvatarGroupTooltipArrow";

function isAvatarGroupTooltip(
  node: React.ReactNode,
): node is React.ReactElement<AvatarGroupTooltipProps> {
  return (
    React.isValidElement(node) &&
    (node.type === AvatarGroupTooltip ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node.type as any)?.displayName === AvatarGroupTooltip.displayName)
  );
}

function stripTooltipFromTree(node: React.ReactNode): {
  node: React.ReactNode;
  tooltip: React.ReactElement | null;
} {
  if (!React.isValidElement(node)) return { node, tooltip: null };

  if (isAvatarGroupTooltip(node)) {
    return { node: null, tooltip: node };
  }

  const element = node as React.ReactElement<{ children?: React.ReactNode }>;
  const children = element.props?.children;
  if (!children) return { node, tooltip: null };

  let tooltip: React.ReactElement | null = null;

  const nextChildren = React.Children.map(children, (child) => {
    const next = stripTooltipFromTree(child);
    if (tooltip == null && next.tooltip != null) tooltip = next.tooltip;
    return next.node;
  });

  return { node: React.cloneElement(node, undefined, nextChildren), tooltip };
}

function AvatarGroup({
  className,
  children,
  invertOverlap = true,
  translate = "-30%",
  transition = { type: "spring", stiffness: 300, damping: 17 },
  tooltipTransition = { type: "spring", stiffness: 300, damping: 35 },
  openDelay = 0,
  closeDelay = 0,
  side = "top",
  sideOffset = 25,
  align = "center",
  alignOffset = 0,
  ...props
}: AvatarGroupProps) {
  const prefersReducedMotion = useReducedMotion();
  const resolvedTransition = prefersReducedMotion
    ? { duration: 0 }
    : transition;
  const resolvedTooltipTransition = prefersReducedMotion
    ? { duration: 0 }
    : tooltipTransition;
  const avatars = React.Children.toArray(children).filter(
    React.isValidElement,
  ) as React.ReactElement[] | [];
  const count = avatars.length;

  return (
    <AvatarGroupProvider
      value={{
        side,
        sideOffset,
        align,
        alignOffset,
        tooltipTransition: resolvedTooltipTransition,
      }}
    >
      <TooltipProvider
        openDelay={openDelay}
        closeDelay={closeDelay}
        transition={resolvedTooltipTransition}
      >
        <div
          data-slot="avatar-group"
          className={cn("flex items-center", className)}
          {...props}
        >
          {avatars.map((child, index) => {
            const { node: cleaned, tooltip } = stripTooltipFromTree(child);
            const isPlaceholder = tooltip == null;
            const baseZ = invertOverlap ? count - index : index + 1;

            const item = (
              <motion.div
                key={child.key ?? index}
                data-slot="avatar-group-item"
                className={cn(
                  "relative",
                  isPlaceholder ? "pointer-events-none" : "cursor-pointer",
                )}
                initial={false}
                animate={{ x: index === 0 ? 0 : translate, zIndex: baseZ }}
                whileHover={
                  isPlaceholder || prefersReducedMotion
                    ? undefined
                    : { x: 0, zIndex: 50, scale: 1.02 }
                }
                transition={resolvedTransition}
              >
                {cleaned}
              </motion.div>
            );

            if (!tooltip) return item;

            return (
              <Tooltip key={child.key ?? index}>
                <TooltipTrigger asChild>{item}</TooltipTrigger>
                {tooltip}
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>
    </AvatarGroupProvider>
  );
}

export {
  AvatarGroup,
  AvatarGroupTooltip,
  AvatarGroupTooltipArrow,
  type AvatarGroupProps,
  type AvatarGroupTooltipProps,
  type AvatarGroupTooltipArrowProps,
  type AvatarGroupContextType,
};
