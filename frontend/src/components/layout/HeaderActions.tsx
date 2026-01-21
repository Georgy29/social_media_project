import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/components/layout/LogoutButton";

type HeaderActionsProps = {
  onCompose: () => void;
  composeLabel?: string;
};

export function HeaderActions({
  onCompose,
  composeLabel = "Post",
}: HeaderActionsProps) {
  return (
    <>
      <Button onClick={onCompose}>{composeLabel}</Button>
      <LogoutButton />
    </>
  );
}
