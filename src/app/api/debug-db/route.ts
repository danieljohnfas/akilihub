import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { countries } from '@/lib/db/schema/shared';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await db.select().from(countries).limit(1);
    return NextResponse.json({ status: 'ok', data });
  } catch (err: unknown) {
    const e = err as any;
    return NextResponse.json({ 
      status: 'error', 
      message: e.message, 
      code: e.code, 
      stack: e.stack, 
      details: e
    }, { status: 500 });
  }
}
