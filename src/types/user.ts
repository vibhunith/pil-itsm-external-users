export interface ExternalUser {
  id: string;
  username: string;
  password: string; // stored as-is from SharePoint (managed by PowerApps admin tool)
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  status: 'Active' | 'Inactive' | string;
}

export interface SessionUser {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  displayName: string;
  email: string;
  company: string;
}
