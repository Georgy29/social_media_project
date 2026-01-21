import { Button } from "@/components/ui/button";
import { AlertDialogTrigger } from "@/components/animate-ui/components/radix/alert-dialog";

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
      <AlertDialogTrigger asChild>
        <Button variant="outline">Logout</Button>
      </AlertDialogTrigger>
    </>
  );
}
