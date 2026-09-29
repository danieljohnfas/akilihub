import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

/**
 * At-rest encryption for the admin TOTP secret (AES-256-GCM).
 *
 * Stored format: `enc:v1:<iv b64>:<tag b64>:<ciphertext b64>`.
 * Legacy plaintext values (no prefix) are still accepted by `decryptSecret`, so
 * no data migration is required; the login route re-encrypts them on next login.
 *
 * Key: `ADMIN_TOTP_ENCRYPTION_KEY` (preferred — independent of session rotation),
 * falling back to `ADMIN_SESSION_SECRET`. Without either, values stay plaintext
 * (development only).
 */
const PREFIX = 'enc:v1:';

function getKey(): Buffer | null {
  const raw = process.env.ADMIN_TOTP_ENCRYPTION_KEY || process.env.ADMIN_SESSION_SECRET;
  if (!raw) return null;
  return createHash('sha256').update(`akilibrain:admin-totp:${raw}`).digest();
}

export function isEncrypted(value: string): boolean {
  return value.startsWith(PREFIX);
}

export function encryptSecret(plain: string): string {
  const key = getKey();
  if (!key) return plain;
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString('base64')}:${tag.toString('base64')}:${ct.toString('base64')}`;
}

export function decryptSecret(stored: string): string {
  if (!isEncrypted(stored)) return stored;
  const key = getKey();
  if (!key) {
    throw new Error('[admin/crypto] TOTP secret is encrypted but ADMIN_TOTP_ENCRYPTION_KEY / ADMIN_SESSION_SECRET is not set.');
  }
  const [ivB64, tagB64, ctB64] = stored.slice(PREFIX.length).split(':');
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(ctB64, 'base64')), decipher.final()]).toString('utf8');
}
