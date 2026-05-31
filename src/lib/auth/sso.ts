import crypto from 'node:crypto';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';

// Microsoft Entra ID (Azure AD) SSO via OpenID Connect authorization-code flow
// with PKCE. The app registration is single-tenant (AzureADMyOrg) and we use
// the tenant-specific authority, so only Yoda Tech accounts can authenticate.
// We additionally verify the token tenant (tid) and the email domain.

const TENANT_ID = process.env.AZURE_TENANT_ID!;
const CLIENT_ID = process.env.AZURE_CLIENT_ID!;
const CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET!;
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');

/** Only accounts on this email domain may sign in via SSO. */
export const ALLOWED_DOMAIN = (process.env.SSO_ALLOWED_DOMAIN ?? 'yoda-tech.com').toLowerCase();

const AUTHORITY = `https://login.microsoftonline.com/${TENANT_ID}`;
const SCOPE = 'openid profile email';

export const REDIRECT_URI = `${APP_URL}/api/auth/sso/callback`;
export const SSO_STATE_COOKIE = 'pil_sso_state';
export const APP_BASE_URL = APP_URL;

const JWKS = createRemoteJWKSet(new URL(`${AUTHORITY}/discovery/v2.0/keys`));

export function randomString(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('base64url');
}

/** PKCE S256 code challenge from a verifier. */
export function pkceChallenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

export function buildAuthorizeUrl(params: { state: string; nonce: string; codeChallenge: string }): string {
  const u = new URL(`${AUTHORITY}/oauth2/v2.0/authorize`);
  u.searchParams.set('client_id', CLIENT_ID);
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('redirect_uri', REDIRECT_URI);
  u.searchParams.set('response_mode', 'query');
  u.searchParams.set('scope', SCOPE);
  u.searchParams.set('state', params.state);
  u.searchParams.set('nonce', params.nonce);
  u.searchParams.set('code_challenge', params.codeChallenge);
  u.searchParams.set('code_challenge_method', 'S256');
  return u.toString();
}

export async function exchangeCodeForIdToken(code: string, codeVerifier: string): Promise<string> {
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
    code_verifier: codeVerifier,
    scope: SCOPE,
  });
  const res = await fetch(`${AUTHORITY}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!res.ok) throw new Error(`Token exchange failed (${res.status}): ${await res.text()}`);
  const data = await res.json();
  if (!data.id_token) throw new Error('No id_token in token response');
  return data.id_token as string;
}

export interface SsoClaims extends JWTPayload {
  oid?: string;
  email?: string;
  preferred_username?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  tid?: string;
  nonce?: string;
}

/** Verify the ID token signature, issuer, audience, nonce, and tenant. */
export async function verifyIdToken(idToken: string, expectedNonce: string): Promise<SsoClaims> {
  const { payload } = await jwtVerify(idToken, JWKS, {
    issuer: `${AUTHORITY}/v2.0`,
    audience: CLIENT_ID,
  });
  const claims = payload as SsoClaims;
  if (claims.nonce !== expectedNonce) throw new Error('Nonce mismatch');
  if (claims.tid !== TENANT_ID) throw new Error('Tenant mismatch');
  return claims;
}

export function emailDomainAllowed(email: string): boolean {
  return email.toLowerCase().endsWith(`@${ALLOWED_DOMAIN}`);
}
