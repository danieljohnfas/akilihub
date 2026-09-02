import { forgotPassword } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export const metadata = {
  title: 'Forgot Password | AkiliBrain',
};

export default async function ForgotPasswordPage(props: { searchParams: Promise<{ message?: string, error?: string }> }) {
  const searchParams = await props.searchParams;
  const message = searchParams.message;
  const error = searchParams.error;

  return (
    <div className="container relative min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Reset password</h1>
          <p className="text-sm text-muted-foreground">
            Enter your email address and we will send you a password reset link.
          </p>
        </div>

        {error && (
          <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {message && (
          <div className="bg-emerald-500/15 text-emerald-500 text-sm p-3 rounded-md flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <p>{message}</p>
          </div>
        )}

        <form action={forgotPassword} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required placeholder="m@example.com" />
          </div>
          <Button type="submit" className="w-full">
            Send Reset Link
          </Button>
        </form>

        <p className="px-8 text-center text-sm text-muted-foreground">
          <Link href="/login" className="hover:text-primary underline underline-offset-4">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
