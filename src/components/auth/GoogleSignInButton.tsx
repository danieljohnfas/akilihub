'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Icon } from '@iconify/react';
import { createBrowserClient } from '@supabase/ssr';
import { AlertCircle } from 'lucide-react';

export default function GoogleSignInButton({ isSignUp = false }: { isSignUp?: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (authError) {
        setError(authError.message);
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full space-y-4">
      {error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-md text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <p>{error}</p>
        </div>
      )}
      <Button 
        type="button" 
        variant="outline" 
        onClick={handleSignIn}
        disabled={isLoading}
        className="w-full flex items-center gap-2 bg-white/5 border-white/10 hover:bg-white/10"
      >
        <Icon icon="flat-color-icons:google" className="w-5 h-5" />
        {isLoading ? 'Connecting...' : (isSignUp ? 'Sign up with Google' : 'Continue with Google')}
      </Button>
    </div>
  );
}
