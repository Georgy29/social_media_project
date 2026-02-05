import { useMemo, useState } from "react";
import { useLocation, useNavigate, type Location } from "react-router-dom";

import { toast } from "sonner";

import { type ApiError } from "@/api/client";
import { useLoginMutation, useRegisterMutation } from "@/api/queries";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { SignupForm } from "@/components/blocks/signup-form";
import { Logo } from "@/components/Logo";

export default function RegisterPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const registerMutation = useRegisterMutation();
  const loginMutation = useLoginMutation();
  const [error, setError] = useState<string | null>(null);

  const fromPathname = useMemo(() => {
    const state = location.state as { from?: Location } | null;
    return state?.from?.pathname ?? "/feed";
  }, [location.state]);

  return (
    <AuthLayout contentClassName="flex max-w-sm flex-col gap-6">
      <Logo className="self-center" />
      <SignupForm
        pending={registerMutation.isPending || loginMutation.isPending}
        error={error}
        onSignup={(values) => {
          setError(null);
          registerMutation.mutate(values, {
            onSuccess: () => {
              loginMutation.mutate(
                { username: values.username, password: values.password },
                {
                  onSuccess: () => {
                    toast.success("Account created. Welcome!");
                    navigate(fromPathname, { replace: true });
                  },
                  onError: (e: ApiError) => {
                    toast.error(
                      "Account created, but auto-login failed. Please log in manually.",
                    );
                    navigate("/login", { replace: true });
                  },
                },
              );
            },
            onError: (e: ApiError) => {
              setError(e.message);
              toast.error(e.message);
            },
          });
        }}
      />
    </AuthLayout>
  );
}
