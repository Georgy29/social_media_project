import { useState } from "react"
import { useNavigate } from "react-router-dom"

import { IconLayoutGrid } from "@tabler/icons-react"

import { type ApiError } from "@/api/client"
import { useRegisterMutation } from "@/api/queries"
import { SignupForm } from "@/components/blocks/signup-form"

export default function RegisterPage() {
  const navigate = useNavigate()
  const registerMutation = useRegisterMutation()
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <a href="#" className="flex items-center gap-2 self-center font-medium">
          <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
            <IconLayoutGrid className="size-4" />
          </div>
          Acme Inc.
        </a>
        <SignupForm
          pending={registerMutation.isPending}
          error={error}
          onSignup={(values) => {
            setError(null)
            registerMutation.mutate(values, {
              onSuccess: () => navigate("/login", { replace: true }),
              onError: (e: ApiError) => setError(e.message),
            })
          }}
        />
      </div>
    </div>
  )
}
