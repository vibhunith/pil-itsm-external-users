import { graphFetch, listItemsPath } from './client';
import type { ExternalUser } from '@/types/user';

const LIST = process.env.SP_LIST_USERS!;

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
