import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '@/api/auth';
import { AuthShell } from '@/components/auth-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{ message: string; demoResetToken?: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      setResult(await authApi.forgotPassword(email));
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter your email and we'll help you get back in."
      footer={
        <Link to="/login" className="font-semibold text-primary hover:underline">
          Back to sign in
        </Link>
      }
    >
      {result ? (
        <div className="space-y-4">
          <p className="rounded-lg bg-accent px-3 py-2.5 text-sm text-accent-foreground">{result.message}</p>
          {result.demoResetToken && (
            <div className="rounded-xl border border-dashed border-border bg-muted/40 p-4 text-sm">
              <p className="font-medium text-foreground">Demo mode: no email is actually sent.</p>
              <p className="mt-1 text-muted-foreground">Use this link to set a new password:</p>
              <Button className="mt-3 w-full" size="sm" onClick={() => navigate(`/reset-password?token=${result.demoResetToken}`)}>
                Continue to Reset Password
              </Button>
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? 'Sending…' : 'Send Reset Instructions'}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
