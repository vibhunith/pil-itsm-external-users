import { graphFetch, listItemsPath } from './client';

const CONVERSATIONS_LIST = process.env.SP_LIST_CONVERSATIONS!;

export interface Conversation {
  id: string;
  parentID: string;
  message: string;
  senderEmail: string;
  isFromExternalPortal: boolean;
  isPrivateNote: boolean;
  created: string;
}

function mapConversation(item: { id: string; fields: Record<string, unknown> }): Conversation {
  const f = item.fields;
  return {
    id: item.id,
    parentID: String(f.parentID ?? ''),
    message: String(f.conversationDescription ?? f.note ?? ''),
    senderEmail: String(f.emailFromMembers ?? ''),
    isFromExternalPortal: f['IsSyncFromExternalPortal_x003f_'] === true || f['IsSyncFromExternalPortal_x003f_'] === 'True' || f['IsSyncFromExternalPortal_x003f_'] === 1,
    isPrivateNote: f.IsPrivateNote === true || f.IsPrivateNote === 'True' || f.IsPrivateNote === 1,
    created: String(f.Created ?? ''),
  };
}

export async function getConversationsByTicket(numericTicketId: number): Promise<Conversation[]> {
  // parentID is stored as text — fetch all and filter client-side (not indexed)
  const query = `?$expand=fields&$top=5000`;
  const res = await graphFetch(listItemsPath(CONVERSATIONS_LIST, query));
  if (!res.ok) return [];

  const data = await res.json();
  return (data.value ?? [])
    .map(mapConversation)
    .filter((c: Conversation) => c.parentID === String(numericTicketId))
    .sort((a: Conversation, b: Conversation) =>
      new Date(a.created).getTime() - new Date(b.created).getTime()
    );
}

export async function addConversation({
  numericTicketId,
  message,
  senderEmail,
  senderDisplayName,
}: {
  numericTicketId: number;
  message: string;
  senderEmail: string;
  senderDisplayName: string;
}): Promise<void> {
  const fields = {
    parentID: String(numericTicketId),
    conversationDescription: message,
    emailFromMembers: senderEmail,
    emailToMembers: 'powerapps@yoda-tech.com',
    'IsSyncFromExternalPortal_x003f_': true,
    IsPrivateNote: false,
    Title: senderDisplayName,
  };

  const res = await graphFetch(listItemsPath(CONVERSATIONS_LIST), {
    method: 'POST',
    body: JSON.stringify({ fields }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to add conversation: ${err}`);
  }
}
