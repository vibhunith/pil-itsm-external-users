import { NextResponse } from 'next/server';
import { buildAuthorizeUrl, randomString, pkceChallenge, SSO_STATE_COOKIE } from '@/lib/auth/sso';

export const runtime = 'nodejs';

// Start the Microsoft Entra ID sign-in: generate state/nonce/PKCE, stash them
// in a short-lived httpOnly cookie, and redirect to the tenant authorize endpoint.
export async function GET() {
  const state = randomString(24);
  const nonce = randomString(24);
  const codeVerifier = randomString(48);
  const codeChallenge = pkceChallenge(codeVerifier);

  const authorizeUrl = buildAuthorizeUrl({ state, nonce, codeChallenge });

  const res = NextResponse.redirect(authorizeUrl);
  res.cookies.set(SSO_STATE_COOKIE, JSON.stringify({ state, nonce, codeVerifier }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes to complete sign-in
    path: '/api/auth/sso',
  });
  return res;
}
