import * as React from "react"

import { cn } from "@/lib/utils"

export function FlipCard({
  className,
  front,
  back,
  tabIndex = 0,
  ...props
}: Omit<React.ComponentPropsWithoutRef<"div">, "children"> & {
  front: React.ReactNode
  back: React.ReactNode
}) {
  return (
    <div
      className={cn("group [perspective:1000px]", className)}
      tabIndex={tabIndex}
      {...props}
    >
      <div className="relative h-full w-full transition-transform duration-700 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)] group-focus-within:[transform:rotateY(180deg)] motion-reduce:transition-none motion-reduce:[transform:none] motion-reduce:group-hover:[transform:none] motion-reduce:group-focus-within:[transform:none]">
        <div className="absolute inset-0 [backface-visibility:hidden]">
          {front}
        </div>
        <div className="absolute inset-0 [transform:rotateY(180deg)] [backface-visibility:hidden]">
          {back}
        </div>
      </div>
    </div>
  )
}
