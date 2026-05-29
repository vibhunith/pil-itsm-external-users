import { graphFetch, listItemsPath } from './client';
import type { SLAPolicy } from '@/types/sla';

const SLA_LIST = process.env.SP_LIST_SLA!;

export async function getSLAPolicies(): Promise<SLAPolicy[]> {
  const query = `?$expand=fields&$top=200`;
  const res = await graphFetch(listItemsPath(SLA_LIST, query));
  if (!res.ok) throw new Error('Failed to fetch SLA policies');

  const data = await res.json();
  return (data.value ?? []).map((item: { id: string; fields: Record<string, unknown> }) => ({
    id: item.id,
    name: String(item.fields.Name ?? item.fields.Title ?? ''),
    urgency: String(item.fields.urgency ?? ''),
    impact: String(item.fields.impact ?? ''),
    priority: String(item.fields.priority ?? ''),
    operationalHours: String(item.fields.operationalHours ?? 'Business Hours') as
      | 'Calendar Hours'
      | 'Business Hours',
    // Graph returns resolveWithin / respondWithin (number fields in SharePoint)
    resolveWithinHours: Number(item.fields.resolveWithin ?? item.fields.resolveWithinHours ?? 0),
    respondWithinHours: Number(item.fields.respondWithin ?? item.fields.respondWithinHours ?? 0),
    isPolicyEnabled:
      item.fields.IsPolicyEnabled === true || item.fields.IsPolicyEnabled === 'True',
  }));
}

export async function findMatchingSLAPolicy(
  urgency: string,
  impact: string
): Promise<SLAPolicy | null> {
  const policies = await getSLAPolicies();

  // Find enabled policy matching urgency + impact
  const match = policies.find(
    (p) =>
      p.isPolicyEnabled &&
      p.urgency.toLowerCase() === urgency.toLowerCase() &&
      p.impact.toLowerCase() === impact.toLowerCase()
  );

  // Fall back to any matching policy (enabled or not)
  return (
    match ??
    policies.find(
      (p) =>
        p.urgency.toLowerCase() === urgency.toLowerCase() &&
        p.impact.toLowerCase() === impact.toLowerCase()
    ) ??
    null
  );
}
