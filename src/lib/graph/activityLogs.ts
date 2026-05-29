import { graphFetch, listItemsPath } from './client';
import type { ActivityLog } from '@/types/ticket';

const LOG_LIST = process.env.SP_LIST_ACTIVITY_LOGS!;

export interface CreateActivityLogInput {
  parentID: number;
  actor: string;
  activityDetails: string;
}

export async function createActivityLog(input: CreateActivityLogInput): Promise<void> {
  const body = {
    fields: {
      parentID: input.parentID,
      actor: input.actor,
      activityDetails: input.activityDetails,
    },
  };

  const res = await graphFetch(listItemsPath(LOG_LIST), {
    method: 'POST',
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('Failed to create activity log:', err);
    // Non-fatal: log error but don't throw
  }
}

export async function getActivityLogsByParentID(parentID: number): Promise<ActivityLog[]> {
  const query = `?$filter=fields/parentID eq ${parentID}&$expand=fields&$orderby=fields/Created asc&$top=200`;
  const res = await graphFetch(listItemsPath(LOG_LIST, query));
  if (!res.ok) return [];

  const data = await res.json();
  return (data.value ?? []).map((item: { id: string; fields: Record<string, unknown> }) => ({
    id: item.id,
    parentID: Number(item.fields.parentID ?? 0),
    actor: String(item.fields.actor ?? ''),
    activityDetails: String(item.fields.activityDetails ?? ''),
    created: String(item.fields.Created ?? ''),
  }));
}

export function buildCreationActivityDetails(params: {
  displayName: string;
  status: string;
  urgency: string;
  priority: string;
  system: string;
  module: string;
  subModule: string;
  impact: string;
  slaPolicyName?: string;
}): string {
  return `Created ticket by ${params.displayName}
Status : ${params.status}
Urgency : ${params.urgency}
Priority : ${params.priority}
System : ${params.system}
Module : ${params.module}
Sub Module : ${params.subModule}
Type : Incident Request
Impact : ${params.impact}

System executed default SLA Policy (${params.slaPolicyName ?? 'SLA'})`;
}
