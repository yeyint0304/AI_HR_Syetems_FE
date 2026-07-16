"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { PasswordField } from "@/components/ui/PasswordField";
import { Alert } from "@/components/ui/Alert";
import { loginSchema, type LoginFormValues } from "@/lib/validators/auth.validators";
import { useLogin } from "@/hooks/useAuth";
import { getApiErrorMessage } from "@/lib/utils/getApiErrorMessage";

export function LoginForm() {
  const [formError, setFormError] = useState<string | null>(null);
  const loginMutation = useLogin();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { usernameOrEmail: "", password: "" },
  });

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    loginMutation.mutate(values, {
      onError: (error) => {
        setFormError(getApiErrorMessage(error, "Invalid username/email or password."));
      },
    });
  });

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-5">
      {formError && <Alert variant="error">{formError}</Alert>}

      <TextField
        label="Username or email"
        type="text"
        autoComplete="username"
        error={errors.usernameOrEmail?.message}
        {...register("usernameOrEmail")}
      />

      <PasswordField
        label="Password"
        autoComplete="current-password"
        error={errors.password?.message}
        {...register("password")}
      />

      <Button type="submit" isLoading={loginMutation.isPending} className="w-full">
        Sign In
      </Button>
    </form>
  );
}
