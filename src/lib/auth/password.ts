import bcrypt from 'bcryptjs';

// One-way password hashing with bcrypt. Stored values are bcrypt hashes
// (e.g. "$2b$10$...."). Legacy accounts created before hashing was added
// still hold plain-text passwords; verifyPassword handles both so existing
// users can sign in, and the login route re-hashes them on next login.

const SALT_ROUNDS = 10;

// bcrypt hashes start with $2a$ / $2b$ / $2y$ followed by the cost factor.
const BCRYPT_RE = /^\$2[aby]\$\d{2}\$/;

/** True if the stored value is already a bcrypt hash (vs. legacy plain text). */
export function isHashed(stored: string): boolean {
  return BCRYPT_RE.test(stored ?? '');
}

/** One-way hash a plain-text password for storage. */
export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

/**
 * Verify a plain-text password against the stored value.
 * - Hashed value  → bcrypt.compare
 * - Legacy plain  → direct comparison (so pre-hashing accounts still work)
 */
export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  if (!stored) return false;
  if (isHashed(stored)) return bcrypt.compare(plain, stored);
  return plain === stored;
}
