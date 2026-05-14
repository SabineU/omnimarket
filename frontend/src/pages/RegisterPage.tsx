// frontend/src/pages/RegisterPage.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema } from '@omnimarket/shared';
import { useAuth } from '../hooks/useAuth';
import { Input, Button, PasswordInput } from '../components/ui';
import { useNavigate, Link } from 'react-router-dom';
import { useState } from 'react';
import { isAxiosError } from 'axios';
import type { z } from 'zod';

type RegisterFormData = z.input<typeof registerSchema>;

function RegisterPage(): React.JSX.Element {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: 'CUSTOMER',
    },
  });

  const onSubmit = async (data: RegisterFormData): Promise<void> => {
    setServerError(null);
    try {
      await registerUser({
        email: data.email,
        password: data.password,
        name: data.name,
        role: data.role,
      });
      navigate('/');
    } catch (err: unknown) {
      const message =
        isAxiosError(err) && err.response?.data?.message
          ? err.response.data.message
          : 'Registration failed. Please try again.';
      setServerError(message);
    }
  };

  return (
    <div className="mx-auto max-w-md mt-12">
      <h1 className="text-3xl font-bold mb-6">Create your account</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Full name"
          autoComplete="name"
          error={errors.name?.message}
          data-testid="register-name-input"
          {...register('name')}
        />

        <Input
          label="Email"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          data-testid="register-email-input"
          {...register('email')}
        />

        <PasswordInput
          label="Password"
          autoComplete="new-password"
          error={errors.password?.message}
          data-testid="register-password-input"
          {...register('password')}
        />

        <input type="hidden" {...register('role')} />

        {serverError && <p className="text-sm text-error-600 dark:text-error-400">{serverError}</p>}

        <Button
          type="submit"
          loading={isSubmitting}
          className="w-full"
          data-testid="register-submit-button"
        >
          Create account
        </Button>
      </form>

      <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">
        Already have an account?{' '}
        <Link
          to="/login"
          className="text-primary-600 hover:underline font-medium"
          data-testid="login-link"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}

export default RegisterPage;
