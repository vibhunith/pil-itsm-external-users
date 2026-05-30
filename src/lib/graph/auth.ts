import { graphFetch, listItemsPath } from './client';
import type { ExternalUser, RegisterPayload, CreateUserResult } from '@/types/user';

const LIST = process.env.SP_LIST_USERS!;

// New self-service registrations start Inactive and are routed to this sponsor
// for approval. A Power Automate flow on the list approves them: sets status to
// Active and clears the sponsor.
const SPONSOR_EMAIL = 'vibhor@yoda-tech.com';

// Fetch all users and filter client-side.
// The username/email columns are not indexed in SharePoint so server-side $filter fails.
async function getAllUsers(): Promise<ExternalUser[]> {
  const query = `?$expand=fields&$top=500`;
  const res = await graphFetch(listItemsPath(LIST, query));
  if (!res.ok) return [];
  const data = await res.json();
  return (data.value ?? []).map(mapToUser);
}

export async function findUserByUsername(username: string): Promise<ExternalUser | null> {
  const users = await getAllUsers();
  return users.find((u) => u.username.toLowerCase() === username.toLowerCase()) ?? null;
}

export async function findUserByEmail(email: string): Promise<ExternalUser | null> {
  const users = await getAllUsers();
  return users.find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? null;
}

// Create a self-service registration: writes a new user with status Inactive
// and the approval sponsor set. Rejects duplicate username/email.
export async function createUser(payload: RegisterPayload): Promise<CreateUserResult> {
  const users = await getAllUsers();
  const username = payload.username.trim();
  const email = payload.email.trim();

  if (users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
    return { ok: false, code: 'USERNAME_TAKEN', message: 'This username is already taken.' };
  }
  if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
    return { ok: false, code: 'EMAIL_TAKEN', message: 'An account with this email already exists.' };
  }

  const fields = {
    Title: username,
    username,
    password: payload.password,
    firstName: payload.firstName.trim(),
    lastName: payload.lastName.trim(),
    email,
    company: payload.company.trim(),
    status: 'Inactive',
    sponsor: SPONSOR_EMAIL,
  };

  const res = await graphFetch(listItemsPath(LIST), {
    method: 'POST',
    body: JSON.stringify({ fields }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to create user (${res.status}): ${err}`);
  }

  const created = await res.json();
  return { ok: true, id: created.id };
}

export async function updateUserPassword(userId: string, newPassword: string): Promise<void> {
  const res = await graphFetch(
    `/sites/${process.env.SHAREPOINT_SITE_ID}/lists/${LIST}/items/${userId}/fields`,
    {
      method: 'PATCH',
      body: JSON.stringify({ password: newPassword }),
    }
  );

  if (!res.ok) {
    throw new Error('Failed to update password');
  }
}

export async function storeResetLink(userId: string, resetLink: string): Promise<void> {
  const res = await graphFetch(
    `/sites/${process.env.SHAREPOINT_SITE_ID}/lists/${LIST}/items/${userId}/fields`,
    {
      method: 'PATCH',
      body: JSON.stringify({ resetLink }),
    }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to store reset link (${res.status}): ${err}`);
  }
}

export async function clearResetLink(userId: string): Promise<void> {
  await graphFetch(
    `/sites/${process.env.SHAREPOINT_SITE_ID}/lists/${LIST}/items/${userId}/fields`,
    {
      method: 'PATCH',
      body: JSON.stringify({ resetLink: '' }),
    }
  );
}

export async function getStoredResetLink(userId: string): Promise<string> {
  const res = await graphFetch(
    `/sites/${process.env.SHAREPOINT_SITE_ID}/lists/${LIST}/items/${userId}?$expand=fields($select=resetLink)`
  );
  if (!res.ok) return '';
  const data = await res.json();
  return String(data.fields?.resetLink ?? '');
}

function mapToUser(item: { id: string; fields: Record<string, string> }): ExternalUser {
  const f = item.fields;
  return {
    id: item.id,
    username: f.username ?? '',
    password: f.password ?? '',
    firstName: f.firstName ?? '',
    lastName: f.lastName ?? '',
    email: f.email ?? '',
    company: f.company ?? '',
    status: f.status ?? 'Inactive',
  };
}
