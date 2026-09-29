import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SESSION_COOKIE, verifyAdminSession } from './session';

/** True when the current request carries a valid admin session cookie. */
export async function isAdminRequest(): Promise<boolean> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return Boolean(token && (await verifyAdminSession(token)));
}

/**
 * Guard for admin *pages* that live outside the `(dashboard)` layout.
 * Never rely on middleware alone: middleware can be bypassed by framework bugs.
 */
export async function requireAdminPage(): Promise<void> {
  if (!(await isAdminRequest())) redirect('/admin/login');
}

/**
 * Guard for Server Actions. Server Actions are public POST endpoints that can be
 * invoked from any route by action id, so the `/admin` middleware matcher does NOT
 * protect them — every admin action must call this itself.
 */
export async function assertAdminAction(): Promise<void> {
  if (!(await isAdminRequest())) throw new Error('Unauthorized');
}
