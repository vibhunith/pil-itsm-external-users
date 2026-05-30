import { graphFetch, listItemsPath, SITE_ID } from './client';
import type { SessionUser } from '@/types/user';

const CAT_LIST = process.env.SP_LIST_SR_CATEGORIZATION!;
const SR_LIST = process.env.SP_LIST_SR_REQUESTS!;
const IT_SERVICE_LIST = process.env.SP_LIST_SR_ITSERVICE!;
const ACTIVITY_LOGS_LIST = process.env.SP_LIST_SR_ACTIVITY_LOGS!;
const CONVERSATIONS_LIST = process.env.SP_LIST_SR_CONVERSATIONS!;

export interface CategorizationItem {
  id: string;
  title: string;
}

export interface ServiceRequest {
  id: string;
  indexId: number;   // TransactionalRequests item ID — used as parentID for conversations & activity logs
  serviceID: string;
  serviceType: string;
  system: string;
  category: string;
  subCategory: string;
  subject: string;
  scope: string;
  urgency: string;
  status: string;
  email: string;
  displayName: string;
  created: string;
  modified: string;
}

export interface SRConversation {
  id: string;
  parentID: string;
  message: string;
  senderEmail: string;
  created: string;
}

export interface SRActivityLog {
  id: string;
  parentID: number;
  actor: string;
  activityDetails: string;
  created: string;
}

export interface CreateServiceRequestPayload {
  serviceTypeName: string;
  systemName: string;
  categoryName: string;
  subCategoryName?: string;
  subject: string;
  scope: string;
  urgency: string;
  remarks?: string;
}

// ─── Categorization ────────────────────────────────────────────────────────

export async function getCategorization(
  masterType: string,
  parentId?: string
): Promise<CategorizationItem[]> {
  const safeType = masterType.replace(/'/g, "''");
  let filter = `fields/MasterType eq '${safeType}'`;
  if (parentId) filter += ` and fields/ParentID eq '${parentId.replace(/'/g, "''")}'`;

  let res = await graphFetch(listItemsPath(CAT_LIST, `?$expand=fields&$filter=${encodeURIComponent(filter)}&$top=500`));

  if (!res.ok) {
    console.warn(`getCategorization filter failed (${res.status}), falling back to full fetch. type=${masterType}`);
    res = await graphFetch(listItemsPath(CAT_LIST, `?$expand=fields&$top=2000`));
    if (!res.ok) {
      console.error('getCategorization full fetch also failed:', await res.text());
      return [];
    }
  }

  const data = await res.json();
  const all: { id: string; fields: Record<string, unknown> }[] = data.value ?? [];
  console.log(`getCategorization: fetched ${all.length} items for type=${masterType} parentId=${parentId}`);

  return all
    .filter((item) => {
      const mt = String(item.fields?.MasterType ?? '').trim();
      const pid = String(item.fields?.ParentID ?? '').trim();
      if (mt !== masterType) return false;
      if (parentId !== undefined && pid !== String(parentId)) return false;
      return true;
    })
    .map((item) => ({ id: item.id, title: String(item.fields?.Title ?? '') }));
}

// ─── Service ID generation ─────────────────────────────────────────────────

export async function getNextServiceID(): Promise<string> {
  // Query TransactionalRequests sorted by creation time — has full SR history
  const res = await graphFetch(listItemsPath(SR_LIST, `?$expand=fields&$orderby=createdDateTime desc&$top=1`));
  if (!res.ok) {
    console.error('getNextServiceID fetch failed:', res.status, await res.text());
    return 'SR1';
  }
  const data = await res.json();
  const raw: string = data.value?.[0]?.fields?.service_ID ?? '';
  const num = parseInt(raw.replace(/[^0-9]/g, ''), 10);
  return `SR${isNaN(num) ? 1 : num + 1}`;
}

// ─── Create service request ────────────────────────────────────────────────

export async function createServiceRequest(
  payload: CreateServiceRequestPayload,
  user: SessionUser,
  _files: File[] = []
): Promise<{ serviceID: string; srItemId: string }> {
  const serviceID = await getNextServiceID();

  // 1. Create TransactionalRequests record
  const createSrRes = await graphFetch(listItemsPath(SR_LIST), {
    method: 'POST',
    body: JSON.stringify({
      fields: {
        Title: payload.subject,
        srModule: 'IT Service Request',
        srSubModule: payload.serviceTypeName,
        service_ID: serviceID,
        status: 'Open',
        source: 'External Portal',
        workFlowFieldValues2: payload.systemName,
        workFlowFieldValues3: payload.categoryName,
        workFlowFieldValues4: payload.subCategoryName ?? '',
        System: payload.systemName,
        Category: payload.categoryName,
      },
    }),
  });
  if (!createSrRes.ok) throw new Error(`Failed to create SR TransactionalRequest: ${await createSrRes.text()}`);
  const createdSr = await createSrRes.json();
  const srItemId: string = createdSr.id;

  // 2. Patch Index_ID
  await graphFetch(`/sites/${SITE_ID}/lists/${SR_LIST}/items/${srItemId}/fields`, {
    method: 'PATCH',
    body: JSON.stringify({ Index_ID: parseInt(srItemId, 10) }),
  });

  // 3. Create ITService record — store email + userName so we can filter "My Requests"
  const createItRes = await graphFetch(listItemsPath(IT_SERVICE_LIST), {
    method: 'POST',
    body: JSON.stringify({
      fields: {
        Title: payload.subject,
        type_ITService: payload.serviceTypeName,
        urgency: payload.urgency,
        scopeOfRequest: payload.scope,
        reasonForRequest: payload.scope,
        source: 'Portal',
        service_ID: serviceID,
        index_ID: parseInt(srItemId, 10),
        status: 'Open',
        externalUserEmail: user.email,
        externalUserDisplayName: user.displayName,
        // notes = system name for display on detail page
        notes: payload.systemName,
        ServiceCategory: payload.categoryName,
        ServiceTypeCCR: payload.serviceTypeName,
        ServiceCatalogueCCR: payload.categoryName,
        ITServiceSubcategory: payload.subCategoryName ?? '',
      },
    }),
  });
  if (!createItRes.ok) throw new Error(`Failed to create ITService item: ${await createItRes.text()}`);
  const createdIt = await createItRes.json();
  const itServiceItemId: string = createdIt.id;

  // 4. Create initial activity log — parentID = TransactionalRequests item ID
  await createSRActivityLog({
    parentID: parseInt(srItemId, 10),
    actor: 'System',
    activityDetails: buildActivityDetails(payload, user, serviceID),
    srSubModule: payload.serviceTypeName,
    srModule: payload.systemName,
  });

  return { serviceID, srItemId: itServiceItemId };
}

// ─── List / detail ─────────────────────────────────────────────────────────

function mapITServiceItem(item: { id: string; fields: Record<string, unknown> }): ServiceRequest {
  const f = item.fields;
  return {
    id: item.id,
    indexId: Number(f.index_ID ?? 0),  // TransactionalRequests item ID
    serviceID: String(f.service_ID ?? ''),
    serviceType: String(f.type_ITService ?? ''),
    system: String(f.notes ?? ''),           // stored in notes on creation
    category: String(f.ServiceCategory ?? ''),
    subCategory: String(f.ITServiceSubcategory ?? ''),
    subject: String(f.Title ?? ''),
    scope: String(f.scopeOfRequest ?? ''),
    urgency: String(f.urgency ?? ''),
    status: String(f.status ?? 'Open'),
    email: String(f.externalUserEmail ?? ''),
    displayName: String(f.externalUserDisplayName ?? ''),
    created: String(f.Created ?? ''),
    modified: String(f.Modified ?? ''),
  };
}

export async function getSRsByUser(
  userEmail: string,
  options: { page?: number; pageSize?: number } = {}
): Promise<{ items: ServiceRequest[]; total: number }> {
  const { page = 1, pageSize = 10 } = options;
  const safeEmail = userEmail.replace(/'/g, "''");

  let res = await graphFetch(
    listItemsPath(IT_SERVICE_LIST, `?$expand=fields&$filter=${encodeURIComponent(`fields/externalUserEmail eq '${safeEmail}'`)}&$top=500`)
  );

  if (!res.ok) {
    // email column not indexed — fall back to full fetch
    res = await graphFetch(listItemsPath(IT_SERVICE_LIST, `?$expand=fields&$top=2000`));
  }
  if (!res.ok) return { items: [], total: 0 };

  const data = await res.json();
  let all: ServiceRequest[] = (data.value ?? [])
    .map(mapITServiceItem)
    .filter((sr: ServiceRequest) => sr.email.toLowerCase() === userEmail.toLowerCase());

  // Sort by created desc
  all.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());

  const total = all.length;
  const start = (page - 1) * pageSize;
  return { items: all.slice(start, start + pageSize), total };
}

export async function getSRById(id: string): Promise<ServiceRequest | null> {
  const res = await graphFetch(
    `/sites/${SITE_ID}/lists/${IT_SERVICE_LIST}/items/${id}?$expand=fields`
  );
  if (!res.ok) return null;
  const item = await res.json();
  return mapITServiceItem(item);
}

// ─── Activity logs ─────────────────────────────────────────────────────────

export async function getSRActivityLogs(parentID: number): Promise<SRActivityLog[]> {
  // parentID is indexed — server-side filter works
  const res = await graphFetch(
    listItemsPath(ACTIVITY_LOGS_LIST, `?$expand=fields&$filter=${encodeURIComponent(`fields/parentID eq ${parentID}`)}&$orderby=fields/Created asc&$top=200`)
  );
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

export async function createSRActivityLog(input: {
  parentID: number;
  actor: string;
  activityDetails: string;
  srSubModule?: string;
  srModule?: string;
}): Promise<void> {
  const res = await graphFetch(listItemsPath(ACTIVITY_LOGS_LIST), {
    method: 'POST',
    body: JSON.stringify({
      fields: {
        Title: `Activity log`,
        parentID: input.parentID,
        actor: input.actor,
        activityDetails: input.activityDetails,
        srSubModule: input.srSubModule ?? '',
        srModule: input.srModule ?? '',
      },
    }),
  });
  if (!res.ok) console.error('Failed to create SR activity log:', await res.text());
}

// ─── Conversations ─────────────────────────────────────────────────────────

export async function getSRConversations(parentID: string): Promise<SRConversation[]> {
  // parentID is Text — try filter first, fall back to full fetch
  const safeId = parentID.replace(/'/g, "''");
  let res = await graphFetch(
    listItemsPath(CONVERSATIONS_LIST, `?$expand=fields&$filter=${encodeURIComponent(`fields/parentID eq '${safeId}'`)}&$top=500`)
  );
  if (!res.ok) {
    res = await graphFetch(listItemsPath(CONVERSATIONS_LIST, `?$expand=fields&$top=2000`));
  }
  if (!res.ok) return [];

  const data = await res.json();
  return (data.value ?? [])
    .map((item: { id: string; fields: Record<string, unknown> }) => ({
      id: item.id,
      parentID: String(item.fields.parentID ?? ''),
      message: String(item.fields.conversationDescription ?? item.fields.note ?? ''),
      senderEmail: String(item.fields.emailFromMembers ?? ''),
      created: String(item.fields.Created ?? ''),
    }))
    .filter((c: SRConversation) => c.parentID === parentID)
    .sort((a: SRConversation, b: SRConversation) =>
      new Date(a.created).getTime() - new Date(b.created).getTime()
    );
}

export async function addSRConversation(input: {
  parentID: string;
  message: string;
  senderEmail: string;
  senderDisplayName: string;
}): Promise<void> {
  const res = await graphFetch(listItemsPath(CONVERSATIONS_LIST), {
    method: 'POST',
    body: JSON.stringify({
      fields: {
        Title: input.senderDisplayName,
        parentID: input.parentID,
        conversationDescription: input.message,
        emailFromMembers: input.senderEmail,
        emailToMembers: '',
      },
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to add SR conversation: ${err}`);
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function buildActivityDetails(
  payload: CreateServiceRequestPayload,
  user: SessionUser,
  serviceID: string
): string {
  return [
    `Created by ${user.displayName}`,
    `Status : Open`,
    `Service ID : ${serviceID}`,
    `Service Type : ${payload.serviceTypeName}`,
    `System : ${payload.systemName}`,
    `Category : ${payload.categoryName}`,
    `Sub Category : ${payload.subCategoryName ?? '—'}`,
    `Urgency : ${payload.urgency}`,
    `Scope of Request : ${payload.scope}`,
    `Requestor : ${user.displayName} (${user.email})`,
    `Source : External Portal`,
  ].join('\n');
}
