import { useMemo, useState } from "react";
import { useLocation, useNavigate, type Location } from "react-router-dom";
import { toast } from "sonner";

import { LoginForm } from "@/components/blocks/login-form";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { type ApiError } from "@/api/client";
import { useLoginMutation } from "@/api/queries";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const loginMutation = useLoginMutation();
  const [error, setError] = useState<string | null>(null);

  const fromPathname = useMemo(() => {
    const state = location.state as { from?: Location } | null;
    return state?.from?.pathname ?? "/feed";
  }, [location.state]);

  return (
    <AuthLayout contentClassName="max-w-sm md:max-w-4xl">
      <LoginForm
        pending={loginMutation.isPending}
        error={error}
        onLogin={({ username, password }) => {
          setError(null);
          loginMutation.mutate(
            { username, password },
            {
              onSuccess: () => {
                toast.success("Logged in");
                navigate(fromPathname, { replace: true });
              },
              onError: (e: ApiError) => {
                setError(e.message);
                toast.error(e.message);
              },
            },
          );
        }}
      />
    </AuthLayout>
  );
}
