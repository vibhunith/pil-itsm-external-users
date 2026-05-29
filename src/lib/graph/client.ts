const TOKEN_URL = `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/token`;

let cachedToken: { value: string; expiresAt: number } | null = null;
let cachedSpToken: { value: string; expiresAt: number } | null = null;

async function fetchToken(scope: string): Promise<{ value: string; expiresAt: number }> {
  const now = Date.now();
  const body = new URLSearchParams({
    client_id: process.env.AZURE_CLIENT_ID!,
    client_secret: process.env.AZURE_CLIENT_SECRET!,
    scope,
    grant_type: 'client_credentials',
  });

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Failed to get token (scope=${scope}): ${error}`);
  }

  const data = await res.json();
  return { value: data.access_token, expiresAt: now + data.expires_in * 1000 };
}

export async function getGraphAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60_000) return cachedToken.value;
  cachedToken = await fetchToken('https://graph.microsoft.com/.default');
  return cachedToken.value;
}

// SharePoint REST API requires a token scoped to the SP tenant, not graph.microsoft.com
export async function getSharePointAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedSpToken && cachedSpToken.expiresAt > now + 60_000) return cachedSpToken.value;
  // Derive tenant host from the site URL env var or fall back to constructing from tenant id
  const tenantHost = process.env.SHAREPOINT_SITE_ID?.split(',')[0] ?? '';
  const spHost = tenantHost.includes('.sharepoint.com')
    ? `https://${tenantHost}`
    : `https://${process.env.AZURE_TENANT_ID}.sharepoint.com`;
  cachedSpToken = await fetchToken(`${spHost}/.default`);
  return cachedSpToken.value;
}

export async function graphFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await getGraphAccessToken();
  const url = `https://graph.microsoft.com/v1.0${path}`;

  return fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
}

export const SITE_ID = process.env.SHAREPOINT_SITE_ID!;

export function listPath(listName: string): string {
  return `/sites/${SITE_ID}/lists/${listName}`;
}

export function listItemsPath(listName: string, query = ''): string {
  return `/sites/${SITE_ID}/lists/${listName}/items${query}`;
}
