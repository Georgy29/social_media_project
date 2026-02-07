type AnimatedCountProps = {
  value: number;
  direction: "up" | "down";
  animationKey: number;
};

export function AnimatedCount({
  value,
  direction,
  animationKey,
}: AnimatedCountProps) {
  const animationClass =
    animationKey > 0
      ? direction === "up"
        ? "motion-safe:animate-[count-slide-up_160ms_ease-out_1]"
        : "motion-safe:animate-[count-slide-down_160ms_ease-out_1]"
      : "";

  return (
    <span className="inline-flex h-4 min-w-[1.5ch] items-center justify-center overflow-hidden tabular-nums">
      <span key={animationKey} className={animationClass}>
        {value}
      </span>
    </span>
  );
}
