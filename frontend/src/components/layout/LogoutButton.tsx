import { AlertDialogTrigger } from "@/components/animate-ui/components/radix/alert-dialog";
import { Button } from "@/components/ui/button";

type LogoutButtonProps = {
  className?: string;
  label?: string;
};

export function LogoutButton({
  className,
  label = "Logout",
}: LogoutButtonProps) {
  return (
    <AlertDialogTrigger asChild>
      <Button className={className} variant="outline">
        {label}
      </Button>
    </AlertDialogTrigger>
  );
}
