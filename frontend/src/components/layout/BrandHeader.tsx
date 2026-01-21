import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";

type BrandHeaderProps = {
  onClick: () => void;
  label?: string;
  ariaLabel?: string;
};

export function BrandHeader({
  onClick,
  label = "Social",
  ariaLabel = "Go to feed",
}: BrandHeaderProps) {
  return (
    <div className="flex justify-center">
      <Button
        variant="ghost"
        className="h-auto px-2 hover:bg-transparent"
        onClick={onClick}
        aria-label={ariaLabel}
      >
        <Logo size="lg" name={label} />
      </Button>
    </div>
  );
}
