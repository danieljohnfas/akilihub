import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { users } from '@/lib/db/schema/users';
import { eq } from 'drizzle-orm';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('user_id');

  if (!userId) {
    return new NextResponse('Missing user_id parameter', { status: 400 });
  }

  try {
    await db.update(users)
      .set({ emailUpdates: false })
      .where(eq(users.id, userId));

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Unsubscribed</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background-color: #f9fafb; }
          .card { background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); text-align: center; max-width: 400px; width: 100%; }
          h1 { color: #111827; font-size: 1.5rem; margin-bottom: 0.5rem; }
          p { color: #6b7280; margin-bottom: 1.5rem; }
          a { display: inline-block; background: #2563eb; color: white; padding: 0.5rem 1rem; border-radius: 4px; text-decoration: none; font-weight: 500; }
          a:hover { background: #1d4ed8; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>Unsubscribed</h1>
          <p>You have successfully unsubscribed from AkiliBrain recommendation emails.</p>
          <a href="/">Return to Homepage</a>
        </div>
      </body>
      </html>
    `;

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html' },
    });
  } catch (error) {
    console.error('Failed to unsubscribe user:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
