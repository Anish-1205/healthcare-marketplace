import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import type { DemoAccount } from '@carebridge/shared';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthShell } from '@/components/auth-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLogin } from '@/hooks/use-auth';
import { ApiError } from '@/api/client';
import { loginSchema, type LoginFormValues } from '@/lib/auth-schemas';
import { DemoAccountsPanel } from './demo-accounts-panel';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useLogin();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginFormValues) {
    setServerError(null);
    try {
      const { user } = await login.mutateAsync(values);
      const portalHome = user.portal === 'doctor' ? '/doctor' : user.portal === 'organization' ? '/organization' : user.portal === 'pharmacy' ? '/pharmacy' : user.portal === 'admin' ? '/admin' : '/';
      const redirectTo = (location.state as { from?: string } | null)?.from ?? portalHome;
      navigate(redirectTo, { replace: true });
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : 'Something went wrong. Please try again.');
    }
  }

  function fillDemoAccount(account: DemoAccount) {
    setValue('email', account.email);
    setValue('password', account.password);
    setServerError(null);
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to book appointments, order medicines and manage your care."
      footer={
        <>
          New to CareBridge?{' '}
          <Link to="/register" className="font-semibold text-primary hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" placeholder="you@example.com" {...register('email')} />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link to="/forgot-password" className="text-xs font-medium text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <Input id="password" type="password" autoComplete="current-password" placeholder="••••••••" {...register('password')} />
          {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
        </div>

        {serverError && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{serverError}</p>}

        <Button type="submit" className="w-full" disabled={login.isPending}>
          {login.isPending ? 'Signing in…' : 'Sign In'}
        </Button>
      </form>

      <DemoAccountsPanel onSelect={fillDemoAccount} />
    </AuthShell>
  );
}
