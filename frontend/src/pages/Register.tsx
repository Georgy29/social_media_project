import { useState } from "react"
import { useNavigate } from "react-router-dom"

import { toast } from "sonner"

import { type ApiError } from "@/api/client"
import { useRegisterMutation } from "@/api/queries"
import { SignupForm } from "@/components/blocks/signup-form"
import { Logo } from "@/components/Logo"

export default function RegisterPage() {
  const navigate = useNavigate()
  const registerMutation = useRegisterMutation()
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <Logo className="self-center" />
        <SignupForm
          pending={registerMutation.isPending}
          error={error}
          onSignup={(values) => {
            setError(null)
            registerMutation.mutate(values, {
              onSuccess: () => {
                toast.success("Account created. Please log in.")
                navigate("/login", { replace: true })
              },
              onError: (e: ApiError) => {
                setError(e.message)
                toast.error(e.message)
              },
            })
          }}
        />
      </div>
    </div>
  )
}
