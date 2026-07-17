import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { signup } from '@/app/auth/actions';
import Link from 'next/link';
import { AlertCircle } from 'lucide-react';

export const metadata = {
  title: 'Sign Up - AkiliBrain',
  description: 'Create an AkiliBrain account to set up alerts for tenders and jobs.',
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; error?: string }>;
}) {
  const params = await searchParams;
  const message = params.message;
  const error = params.error;

  return (
    <div className="container flex items-center justify-center min-h-[calc(100vh-4rem)] py-12">
      <Card className="w-full max-w-md bg-black/40 border-white/10 backdrop-blur-md">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-3xl font-bold tracking-tight">Create an account</CardTitle>
          <CardDescription>
            Enter your details below to create your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md flex items-center gap-2 mb-4">
              <AlertCircle className="w-4 h-4" />
              <p>{error}</p>
            </div>
          )}
          {message && (
            <div className="bg-emerald-500/15 text-emerald-500 text-sm p-3 rounded-md mb-4">
              <p>{message}</p>
            </div>
          )}
          <form className="space-y-4" action={signup}>
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                name="fullName"
                placeholder="John Doe"
                required
                className="bg-white/5 border-white/10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="m@example.com"
                required
                className="bg-white/5 border-white/10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                className="bg-white/5 border-white/10"
              />
            </div>
            <Button type="submit" className="w-full mt-4">
              Sign Up
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center border-t border-white/10 pt-6">
          <p className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
