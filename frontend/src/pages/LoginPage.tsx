// frontend/src/pages/LoginPage.tsx
// Login form using React Hook Form + Zod (shared loginSchema).
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from '@omnimarket/shared';
import { useAuth } from '../hooks/useAuth';
import { Input, Button, PasswordInput } from '../components/ui';
import { useNavigate, Link } from 'react-router-dom';
import { useState } from 'react';
import { isAxiosError } from 'axios';
import type { z } from 'zod';

type LoginFormData = z.infer<typeof loginSchema>;

function LoginPage(): React.JSX.Element {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData): Promise<void> => {
    setServerError(null);
    try {
      await login(data.email, data.password);
      navigate('/');
    } catch (err: unknown) {
      const message =
        isAxiosError(err) && err.response?.data?.message
          ? err.response.data.message
          : 'Login failed. Please try again.';
      setServerError(message);
    }
  };

  return (
    <div className="mx-auto max-w-md mt-12">
      <h1 className="text-3xl font-bold mb-6">Sign in to OmniMarket</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          data-testid="login-email-input"
          {...register('email')}
        />

        {/* PasswordInput with eye toggle */}
        <PasswordInput
          label="Password"
          autoComplete="current-password"
          error={errors.password?.message}
          data-testid="login-password-input"
          {...register('password')}
        />

        {serverError && <p className="text-sm text-error-600 dark:text-error-400">{serverError}</p>}

        <Button
          type="submit"
          loading={isSubmitting}
          className="w-full"
          data-testid="login-submit-button"
        >
          Sign in
        </Button>
      </form>

      <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">
        Don’t have an account?{' '}
        <Link
          to="/register"
          className="text-primary-600 hover:underline font-medium"
          data-testid="register-link"
        >
          Create one
        </Link>
      </p>
    </div>
  );
}

export default LoginPage;
