export type TicketStatus =
  | 'Open'
  | 'Work in Progress'
  | 'Closed'
  | 'Waiting on Approval'
  | 'Rejected'
  | 'Resolved'
  | 'On Hold';

export type Priority = 'Critical' | 'High' | 'Medium' | 'Low';
export type Urgency = 'Critical' | 'High' | 'Medium' | 'Low';
export type Impact = 'Critical' | 'High' | 'Medium' | 'Low';

export interface Ticket {
  id: string;
  incidentID: string;
  subject: string;
  source: string;
  urgency: Urgency;
  impact: Impact;
  priority: Priority | string;
  system: string;
  module: string;
  subModule: string;
  issueDescription: string;
  status: TicketStatus;
  initialResponseClockSLA?: string;
  initialResolutionClockSLA?: string;
  RCA?: string;
  resolutionNote?: string;
  externalUserDisplayName?: string;
  externalUserEmailID?: string;
  created: string;
  modified: string;
  hasAttachments?: boolean;
}

export interface TicketAttachment {
  id: string;
  name: string;
  size: number;
  contentType: string;
  contentUrl?: string;
}

export interface ActivityLog {
  id: string;
  parentID: number;
  actor: string;
  activityDetails: string;
  created: string;
}

export interface CreateTicketPayload {
  subject: string;
  system: string;
  systemId?: string;
  module: string;
  moduleId?: string;
  subModule: string;
  subModuleId?: string;
  urgency: Urgency;
  impact: Impact;
  issueDescription: string;
  attachments?: File[];
}

export interface TicketListResponse {
  tickets: Ticket[];
  total: number;
  page: number;
  pageSize: number;
}

export interface DashboardStats {
  total: number;
  open: number;
  inProgress: number;
  closed: number;
}
