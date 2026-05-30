import { graphFetch, getSharePointAccessToken, listItemsPath, SITE_ID } from './client';
import { findMatchingSLAPolicy } from './sla';
import { calculateSLA } from '@/lib/sla/calculator';
import { createActivityLog, buildCreationActivityDetails } from './activityLogs';
import { fetchMasterLookups } from './masters';
import type { Ticket, CreateTicketPayload, TicketListResponse, DashboardStats } from '@/types/ticket';
import type { SessionUser } from '@/types/user';

const TICKETS_LIST = process.env.SP_LIST_TICKETS!;

export async function getNextIncidentID(): Promise<string> {
  // Get the most recently created ticket and increment its incidentID by 1.
  const query = `?$expand=fields($select=incidentID)&$orderby=fields/Created desc&$top=1`;
  const res = await graphFetch(listItemsPath(TICKETS_LIST, query));

  if (!res.ok) return 'IR00001';

  const data = await res.json();
  const latest = data.value?.[0];
  const raw = latest?.fields?.incidentID ?? '';
  const num = parseInt(raw.replace(/[^0-9]/g, ''), 10);

  return `IR${String((isNaN(num) ? 0 : num) + 1).padStart(5, '0')}`;
}

export async function createTicket(
  payload: CreateTicketPayload,
  user: SessionUser,
  files: File[] = []
): Promise<{ incidentID: string; ticketId: string }> {
  // 1. Resolve SLA
  const slaPolicy = await findMatchingSLAPolicy(payload.urgency, payload.impact);
  const slaResult = slaPolicy
    ? calculateSLA({
        operationalHours: slaPolicy.operationalHours,
        respondWithinHours: slaPolicy.respondWithinHours,
        resolveWithinHours: slaPolicy.resolveWithinHours,
      })
    : null;

  // 2. Generate incident ID
  const incidentID = await getNextIncidentID();

  // 3. Create ticket in SharePoint
  const fields: Record<string, unknown> = {
    subject: payload.subject,
    urgency: payload.urgency,
    impact: payload.impact,
    priority: slaPolicy?.priority ?? payload.urgency, // fall back to urgency if no SLA
    issueDescription: payload.issueDescription,
    source: 'External Portal',
    externalUserDisplayName: user.displayName,
    externalUserEmailID: user.email,
    status: 'Open',
    incidentID,
    OPHours: slaPolicy?.operationalHours ?? '',
    RespondHours: String(slaPolicy?.respondWithinHours ?? ''),
    ResolveHours: String(slaPolicy?.resolveWithinHours ?? ''),
  };

  // Write lookup IDs for system/module/subModule (SharePoint stores these as lookup fields)
  if (payload.systemId) fields.systemLookupId = parseInt(payload.systemId, 10);
  if (payload.moduleId) fields.moduleLookupId = parseInt(payload.moduleId, 10);
  if (payload.subModuleId) fields.subModuleLookupId = parseInt(payload.subModuleId, 10);

  if (slaResult) {
    fields.initialResponseClockSLA = slaResult.initialResponseClockSLA;
    fields.initialResolutionClockSLA = slaResult.initialResolutionClockSLA;
  }

  const createRes = await graphFetch(listItemsPath(TICKETS_LIST), {
    method: 'POST',
    body: JSON.stringify({ fields }),
  });

  if (!createRes.ok) {
    const err = await createRes.text();
    throw new Error(`Failed to create ticket: ${err}`);
  }

  const created = await createRes.json();
  const ticketId: string = created.id;
  // SharePoint REST API expects the numeric list item ID (same as created.id for list items)
  const spItemId = parseInt(created.fields?.id ?? created.id ?? '0', 10);

  // 4. Upload attachments via SharePoint REST API
  // IMPORTANT: Requires "SharePoint > Sites.ReadWrite.All" Application permission in Azure AD
  // (separate from the Microsoft Graph Sites.ReadWrite.All permission).
  if (files.length > 0) {
    await uploadAttachments(spItemId, files);
  }

  // 5. Create activity log
  const activityDetails = buildCreationActivityDetails({
    displayName: user.displayName,
    status: 'Open',
    urgency: payload.urgency,
    priority: slaPolicy?.priority ?? payload.urgency,
    system: payload.system,
    module: payload.module,
    subModule: payload.subModule,
    impact: payload.impact,
    slaPolicyName: slaPolicy?.name,
  });

  await createActivityLog({
    parentID: spItemId,
    actor: 'System',
    activityDetails,
  });

  return { incidentID, ticketId };
}

// Cache the SharePoint site webUrl (e.g. https://yodatechnologies055.sharepoint.com/sites/xxx)
let cachedSiteUrl: string | null = null;

async function getSharePointSiteUrl(): Promise<string> {
  if (cachedSiteUrl) return cachedSiteUrl;
  const res = await graphFetch(`/sites/${SITE_ID}`);
  if (!res.ok) throw new Error('Failed to resolve SharePoint site URL');
  const data = await res.json();
  cachedSiteUrl = data.webUrl as string;
  return cachedSiteUrl;
}

async function uploadAttachments(spItemId: number, files: File[]): Promise<void> {
  // SharePoint REST API is required for list item attachments (Graph API doesn't support this).
  // The app needs "SharePoint > Application permissions > Sites.ReadWrite.All" in Azure AD
  // (distinct from the Microsoft Graph Sites.ReadWrite.All permission).
  let siteUrl: string;
  let token: string;
  try {
    [siteUrl, token] = await Promise.all([getSharePointSiteUrl(), getSharePointAccessToken()]);
  } catch (err) {
    console.error('Failed to get SharePoint token for attachment upload:', err);
    console.error('Fix: Add "SharePoint > Sites.ReadWrite.All" Application permission in Azure AD for this app.');
    return;
  }

  for (const file of files) {
    const buffer = await file.arrayBuffer();
    const safeName = file.name.replace(/'/g, "''");
    const uploadUrl = `${siteUrl}/_api/web/lists/getByTitle('${TICKETS_LIST}')/items(${spItemId})/AttachmentFiles/add(FileName='${safeName}')`;

    const res = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/octet-stream',
        Accept: 'application/json;odata=verbose',
      },
      body: buffer,
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error(`Attachment upload failed [${file.name}] HTTP ${res.status}:`, errBody);
      if (res.status === 401) {
        console.error('401 = missing SharePoint API permission. In Azure AD: App Registrations → your app → API Permissions → Add permission → SharePoint → Application → Sites.ReadWrite.All → Grant admin consent.');
      }
    } else {
      console.log(`Attachment uploaded: ${file.name} → item ${spItemId}`);
    }
  }
}

function applyClientFilters(
  tickets: Ticket[],
  opts: { status?: string; priority?: string; search?: string; orderBy: string; orderDir: 'asc' | 'desc'; page: number; pageSize: number }
): TicketListResponse {
  let list = tickets;
  if (opts.status) list = list.filter((t) => t.status === opts.status);
  if (opts.priority) list = list.filter((t) => t.priority?.toLowerCase() === opts.priority!.toLowerCase());
  if (opts.search) {
    const q = opts.search.toLowerCase();
    list = list.filter((t) => t.incidentID?.toLowerCase().includes(q) || t.subject?.toLowerCase().includes(q));
  }
  list.sort((a, b) => {
    const aVal = String((a as unknown as Record<string, unknown>)[opts.orderBy] ?? a.created ?? '');
    const bVal = String((b as unknown as Record<string, unknown>)[opts.orderBy] ?? b.created ?? '');
    return opts.orderDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
  });
  const total = list.length;
  const start = (opts.page - 1) * opts.pageSize;
  return { tickets: list.slice(start, start + opts.pageSize), total, page: opts.page, pageSize: opts.pageSize };
}

export async function getTicketsByUser(
  userEmail: string,
  options: {
    page?: number;
    pageSize?: number;
    status?: string;
    priority?: string;
    search?: string;
    orderBy?: string;
    orderDir?: 'asc' | 'desc';
  } = {}
): Promise<TicketListResponse> {
  const { page = 1, pageSize = 10, status, priority, search, orderBy = 'Created', orderDir = 'desc' } = options;

  // Use server-side $filter to only fetch tickets belonging to this user.
  // NOTE: for this to work reliably at scale, index 'externalUserEmailID' in SharePoint list settings.
  // For lists under 5000 items it works without an index.
  const safeEmail = userEmail.replace(/'/g, "''");
  const filterParts = [`fields/externalUserEmailID eq '${safeEmail}'`];
  if (status) filterParts.push(`fields/status eq '${status.replace(/'/g, "''")}'`);
  if (priority) filterParts.push(`fields/priority eq '${priority.replace(/'/g, "''")}'`);

  const filter = `$filter=${filterParts.join(' and ')}`;
  const query = `?$expand=fields&$top=500&${filter}`;

  const [res, lookups] = await Promise.all([
    graphFetch(listItemsPath(TICKETS_LIST, query)),
    fetchMasterLookups().catch(() => undefined),
  ]);

  if (!res.ok) {
    // If filter fails (e.g. column not indexed, list > 5000), fall back to full fetch
    const fallback = await graphFetch(listItemsPath(TICKETS_LIST, `?$expand=fields&$top=5000`));
    if (!fallback.ok) throw new Error('Failed to fetch tickets');
    const fbData = await fallback.json();
    const [res2] = [fbData]; // reuse below
    const allTicketsFallback: Ticket[] = (fbData.value ?? [])
      .map((item: { id: string; fields: Record<string, unknown> }) => mapTicket(item, lookups))
      .filter((t: Ticket) => t.externalUserEmailID?.toLowerCase() === userEmail.toLowerCase());
    return applyClientFilters(allTicketsFallback, { status, priority, search, orderBy, orderDir, page, pageSize });
  }

  const data = await res.json();
  const allTickets: Ticket[] = (data.value ?? [])
    .map((item: { id: string; fields: Record<string, unknown> }) => mapTicket(item, lookups));

  // status/priority were filtered server-side; only search needs client-side filtering
  return applyClientFilters(allTickets, { status: undefined, priority: undefined, search, orderBy, orderDir, page, pageSize });
}

export async function getTicketById(ticketId: string): Promise<Ticket | null> {
  const [res, lookups] = await Promise.all([
    graphFetch(`/sites/${SITE_ID}/lists/${TICKETS_LIST}/items/${ticketId}?$expand=fields`),
    fetchMasterLookups().catch(() => undefined),
  ]);
  if (!res.ok) return null;

  const item = await res.json();
  return mapTicket(item, lookups);
}

export async function getDashboardStats(userEmail: string): Promise<DashboardStats> {
  const safeEmail = userEmail.replace(/'/g, "''");
  let query = `?$expand=fields&$top=500&$filter=fields/externalUserEmailID eq '${safeEmail}'`;
  let res = await graphFetch(listItemsPath(TICKETS_LIST, query));

  // Fall back to full fetch if filter not supported
  if (!res.ok) {
    query = `?$expand=fields&$top=5000`;
    res = await graphFetch(listItemsPath(TICKETS_LIST, query));
  }
  if (!res.ok) return { total: 0, open: 0, inProgress: 0, closed: 0 };

  const data = await res.json();
  const items: { fields: { status?: string; externalUserEmailID?: string } }[] = (
    data.value ?? []
  ).filter(
    (i: { fields: { externalUserEmailID?: string } }) =>
      i.fields.externalUserEmailID?.toLowerCase() === userEmail.toLowerCase()
  );

  return {
    total: items.length,
    open: items.filter((i) => i.fields.status === 'Open').length,
    inProgress: items.filter((i) => i.fields.status === 'Work in Progress').length,
    closed: items.filter(
      (i) => i.fields.status === 'Closed' || i.fields.status === 'Resolved'
    ).length,
  };
}

// Lightweight fetch — only the fields needed for ownership check (no master lookup)
export async function getTicketOwner(ticketId: string): Promise<{ id: string; externalUserEmailID: string } | null> {
  const res = await graphFetch(
    `/sites/${SITE_ID}/lists/${TICKETS_LIST}/items/${ticketId}?$expand=fields($select=externalUserEmailID)`
  );
  if (!res.ok) return null;
  const item = await res.json();
  return {
    id: item.id,
    externalUserEmailID: String(item.fields?.externalUserEmailID ?? ''),
  };
}

export async function reopenTicket(ticketId: string): Promise<void> {
  const res = await graphFetch(
    `/sites/${SITE_ID}/lists/${TICKETS_LIST}/items/${ticketId}/fields`,
    { method: 'PATCH', body: JSON.stringify({ status: 'Open' }) }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to reopen ticket: ${err}`);
  }
}

export async function getTicketAttachments(ticketId: string): Promise<{ name: string; contentUrl: string }[]> {
  const res = await graphFetch(
    `/sites/${SITE_ID}/lists/${TICKETS_LIST}/items/${ticketId}/attachments`
  );
  if (!res.ok) return [];

  const data = await res.json();
  return (data.value ?? []).map((a: { name: string; contentUrl: string }) => ({
    name: a.name,
    contentUrl: a.contentUrl,
  }));
}

type MasterLookups = {
  systems: Map<number, string>;
  modules: Map<number, string>;
  subModules: Map<number, string>;
};

function mapTicket(
  item: { id: string; fields: Record<string, unknown> },
  lookups?: MasterLookups
): Ticket {
  const f = item.fields;
  const systemId = Number(f.systemLookupId ?? 0);
  const moduleId = Number(f.moduleLookupId ?? 0);
  const subModuleId = Number(f.subModuleLookupId ?? 0);

  return {
    id: item.id,
    incidentID: String(f.incidentID ?? ''),
    subject: String(f.subject ?? ''),
    source: String(f.source ?? ''),
    urgency: String(f.urgency ?? '') as Ticket['urgency'],
    impact: String(f.impact ?? '') as Ticket['impact'],
    priority: String(f.priority ?? ''),
    system: lookups?.systems.get(systemId) ?? String(f.system ?? ''),
    module: lookups?.modules.get(moduleId) ?? String(f.module ?? ''),
    subModule: lookups?.subModules.get(subModuleId) ?? String(f.subModule ?? ''),
    issueDescription: String(f.issueDescription ?? ''),
    status: String(f.status ?? 'Open') as Ticket['status'],
    initialResponseClockSLA: f.initialResponseClockSLA as string | undefined,
    initialResolutionClockSLA: f.initialResolutionClockSLA as string | undefined,
    RCA: f.RCA as string | undefined,
    resolutionNote: f.resolutionNote as string | undefined,
    externalUserDisplayName: f.externalUserDisplayName as string | undefined,
    externalUserEmailID: f.externalUserEmailID as string | undefined,
    created: String(f.Created ?? ''),
    modified: String(f.Modified ?? ''),
    hasAttachments: Boolean(f.Attachments),
  };
}
