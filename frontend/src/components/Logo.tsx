import { IconLayoutGrid } from "@tabler/icons-react";

import { cn } from "@/lib/utils";

export type LogoProps = {
  variant?: "full" | "mark";
  size?: "sm" | "md" | "lg" | "xl";
  name?: string;
  className?: string;
};

const sizeStyles: Record<
  NonNullable<LogoProps["size"]>,
  { mark: string; icon: string; name: string }
> = {
  sm: { mark: "h-6 w-6 rounded-md", icon: "h-4 w-4", name: "text-sm" },
  md: { mark: "h-7 w-7 rounded-md", icon: "h-4 w-4", name: "text-base" },
  lg: { mark: "h-9 w-9 rounded-lg", icon: "h-5 w-5", name: "text-lg" },
  xl: {
    mark: "h-14 w-14 rounded-2xl",
    icon: "h-8 w-8",
    name: "text-3xl",
  },
};

export function Logo({
  variant = "full",
  size = "md",
  name = "Microblog",
  className,
}: LogoProps) {
  const styles = sizeStyles[size];

  return (
    <div className={cn("flex items-center gap-2 font-medium", className)}>
      <div
        className={cn(
          "bg-primary text-primary-foreground flex items-center justify-center",
          styles.mark,
        )}
      >
        <IconLayoutGrid className={styles.icon} aria-hidden="true" />
      </div>
      {variant === "full" ? (
        <span className={cn("tracking-tight", styles.name)}>{name}</span>
      ) : null}
    </div>
  );
}
