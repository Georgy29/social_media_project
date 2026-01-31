import {
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/animate-ui/components/radix/alert-dialog";

type LogoutDialogContentProps = {
  onConfirm: () => void;
};

export function LogoutDialogContent({ onConfirm }: LogoutDialogContentProps) {
  return (
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Log Out?</AlertDialogTitle>
        <AlertDialogDescription>
          You will need to sign in again to continue.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction onClick={onConfirm}>Log Out</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  );
}
