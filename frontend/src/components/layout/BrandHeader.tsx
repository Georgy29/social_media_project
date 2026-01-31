import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

type BrandHeaderProps = {
  onClick: () => void;
  label?: string;
  ariaLabel?: string;
  to?: string;
};

export function BrandHeader({
  onClick,
  label = "Social",
  ariaLabel = "Go to feed",
  to = "/feed",
}: BrandHeaderProps) {
  return (
    <div className="flex justify-center">
      <Button
        variant="ghost"
        className="h-auto px-2 hover:bg-transparent"
        aria-label={ariaLabel}
        asChild
      >
        <Link to={to} onClick={onClick}>
          <Logo size="lg" name={label} />
        </Link>
      </Button>
    </div>
  );
}
