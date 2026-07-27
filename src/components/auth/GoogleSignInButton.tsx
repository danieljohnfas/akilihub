'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { AlertCircle } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';

function GoogleSignInButtonInner({ isSignUp = false }: { isSignUp?: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleCredentialResponse = async (response: any) => {
    try {
      setError(null);
      
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      if (!response.credential) {
        throw new Error('No credential received from Google');
      }

      const { data, error: authError } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: response.credential,
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
      router.push(callbackUrl);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    }
  };

  return (
    <div className="w-full space-y-4 flex flex-col items-center">
      {error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-md text-sm flex items-center gap-2 w-full">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}
      <div className="w-full flex justify-center">
        <GoogleLogin
          onSuccess={handleCredentialResponse}
          onError={() => setError('Google Login Failed')}
          useOneTap
          theme="outline"
          shape="rectangular"
          text={isSignUp ? "signup_with" : "signin_with"}
        />
      </div>
    </div>
  );
}

export default function GoogleSignInButton({ isSignUp = false }: { isSignUp?: boolean }) {
  return (
    <Suspense fallback={<div className="h-10 bg-muted animate-pulse rounded-md w-full" />}>
      <GoogleSignInButtonInner isSignUp={isSignUp} />
    </Suspense>
  );
}
