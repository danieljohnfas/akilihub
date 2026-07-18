import { resetPassword } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export const metadata = {
  title: 'Set New Password | AkiliBrain',
};

export default function ResetPasswordPage(props: { searchParams: Promise<{ error?: string }> }) {
  return (
    <div className="container relative min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Set new password</h1>
          <p className="text-sm text-muted-foreground">
            Enter your new password below.
          </p>
        </div>
        
        <form action={resetPassword} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <Input id="password" name="password" type="password" required />
          </div>
          <Button type="submit" className="w-full">
            Update Password
          </Button>
        </form>
      </div>
    </div>
  );
}
