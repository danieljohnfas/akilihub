import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "admin_config" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "password_hash" text NOT NULL,
        "totp_secret" text NOT NULL,
        "is_setup" boolean DEFAULT false NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
    `);
    return NextResponse.json({ success: true, message: 'Admin table created successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
