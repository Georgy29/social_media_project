import { useMemo, useState } from "react";
import { useLocation, useNavigate, type Location } from "react-router-dom";

import { LoginForm } from "@/components/blocks/login-form";
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
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-4xl">
        <LoginForm
          pending={loginMutation.isPending}
          error={error}
          onLogin={({ username, password }) => {
            setError(null);
            loginMutation.mutate(
              { username, password },
              {
                onSuccess: () => {
                  navigate(fromPathname, { replace: true });
                },
                onError: (e: ApiError) => {
                  setError(e.message);
                },
              },
            );
          }}
        />
      </div>
    </div>
  );
}
