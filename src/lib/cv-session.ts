import { randomUUID } from 'crypto';
import { and, eq } from 'drizzle-orm';
import type { NextRequest, NextResponse } from 'next/server';
import { db, queryOrThrow } from '@/lib/db/client';
import { userDocuments } from '@/lib/db/schema/documents';

/**
 * Anonymous CV ownership.
 *
 * Uploaded CVs are not tied to an account, so a document id alone used to be the only
 * secret needed to read someone's CV. Each upload now also binds the row to a random
 * session id stored in an httpOnly cookie; reads/deletes must present the same cookie.
 */
export const CV_COOKIE = 'cv_session';
export const CV_RETENTION_DAYS = 30;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: unknown): v is string => typeof v === 'string' && UUID.test(v);

export function getCvSessionId(req: NextRequest): string | null {
  const v = req.cookies.get(CV_COOKIE)?.value;
  return isUuid(v) ? v : null;
}

export function ensureCvSessionId(req: NextRequest): string {
  return getCvSessionId(req) ?? randomUUID();
}

export function setCvSessionCookie(res: NextResponse, sessionId: string): void {
  res.cookies.set(CV_COOKIE, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: CV_RETENTION_DAYS * 24 * 60 * 60,
    path: '/',
  });
}

/** Returns the document only if it belongs to the caller's CV session. */
export async function getOwnedDocument(documentId: unknown, sessionId: string | null) {
  if (!isUuid(documentId) || !sessionId) return null;
  const rows = await queryOrThrow(
    db
      .select()
      .from(userDocuments)
      .where(and(eq(userDocuments.id, documentId), eq(userDocuments.sessionId, sessionId)))
      .limit(1),
    8000,
    'Fetch owned CV'
  );
  return rows[0] ?? null;
}
