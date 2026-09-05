import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSafeRelativePath } from '@/lib/security/safe-url';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const rawNext = searchParams.get('next') ?? '/account';
  const next = isSafeRelativePath(rawNext) ? rawNext : '/account';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  let safeOrigin = origin;
  if (appUrl && appUrl.startsWith('http')) {
    safeOrigin = appUrl.endsWith('/') ? appUrl.slice(0, -1) : appUrl;
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(safeOrigin + next);
    }
    console.error('exchangeCodeForSession error:', error);
    return NextResponse.redirect(safeOrigin + '/login?error=' + encodeURIComponent(error.message));
  }

  return NextResponse.redirect(safeOrigin + '/login?error=Invalid auth code');
}
