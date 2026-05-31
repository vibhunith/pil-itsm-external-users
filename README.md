# PIL ITSM External Portal

A Next.js portal for external users to raise and track IT service requests and incident tickets against a SharePoint-backed ITSM system.

---

## Tech Stack

- **Framework**: Next.js (App Router)
- **Auth**: Custom JWT session via Azure AD / Microsoft Graph
- **Backend**: Microsoft Graph API → SharePoint Online lists
- **Styling**: Tailwind CSS

---

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.local.example` to `.env.local` and fill in all values (see below).

```bash
cp .env.local.example .env.local
```

### 3. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

Create a `.env.local` file in the project root with the following variables:

### Azure AD (Microsoft Graph)

| Variable | Description |
|---|---|
| `AZURE_TENANT_ID` | Azure AD tenant ID |
| `AZURE_CLIENT_ID` | App registration client ID |
| `AZURE_CLIENT_SECRET` | App registration client secret |

The Azure AD app registration requires the following **Microsoft Graph API** permissions (Application):
- `Sites.ReadWrite.All` — read/write SharePoint list items via Graph API
- `Mail.Send` — send notification emails (if applicable)

> For SharePoint REST API attachment uploads, the app also needs **SharePoint API** permission: `Sites.ReadWrite.All` (under SharePoint, not Graph).

### SharePoint

| Variable | Description |
|---|---|
| `SHAREPOINT_SITE_ID` | Full SharePoint site ID in the format `tenant.sharepoint.com,siteCollectionId,webId` |

### Session

| Variable | Description |
|---|---|
| `JWT_SECRET` | Secret key used to sign JWT session tokens. Use a long random string in production. |

### App

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_APP_URL` | Public base URL of the app (e.g. `http://localhost:3000` or `https://yourdomain.com`) |
| `NOTIFICATION_EMAIL` | Email address used as sender/recipient for system notifications |
| `POWER_AUTOMATE_RESET_URL` | Power Automate HTTP trigger URL for password reset flow (leave blank to disable) |

### SharePoint List Names — Incident Requests

| Variable | SharePoint List Name |
|---|---|
| `SP_LIST_USERS` | `ITSM_ExternalUsers_Registration` |
| `SP_LIST_SYSTEMS` | `ITSM_SystemConfigurationMaster` |
| `SP_LIST_MODULES` | `ITSM_ModuleConfigurationMaster` |
| `SP_LIST_SUBMODULES` | `ITSM_SubModuleConfigurationMaster` |
| `SP_LIST_SLA` | `ITSM_IR_SLA` |
| `SP_LIST_TICKETS` | `ITSM_IR_TransactionalRequests` |
| `SP_LIST_ACTIVITY_LOGS` | `ITSM_IR_ActivityLogs` |
| `SP_LIST_CONVERSATIONS` | `ITSM_IR_TicketConversation` |

### SharePoint List Names — Service Requests

| Variable | SharePoint List Name |
|---|---|
| `SP_LIST_SR_CATEGORIZATION` | `ITSM_SR_Categorization` |
| `SP_LIST_SR_REQUESTS` | `ITSM_SR_TransactionalRequests` |
| `SP_LIST_SR_ITSERVICE` | `ITSM_SR_ITService` |
| `SP_LIST_SR_ACTIVITY_LOGS` | `ITSM_SR_ITService_ActivityLogs` |
| `SP_LIST_SR_CONVERSATIONS` | `ITSM_SR_ITService_TicketConversation` |

### Complete `.env.local` Example

```env
# Azure AD / Microsoft Graph
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret

# SharePoint
SHAREPOINT_SITE_ID=tenant.sharepoint.com,site-collection-id,web-id

# SharePoint List Names — Incident Requests
SP_LIST_USERS=ITSM_ExternalUsers_Registration
SP_LIST_SYSTEMS=ITSM_SystemConfigurationMaster
SP_LIST_MODULES=ITSM_ModuleConfigurationMaster
SP_LIST_SUBMODULES=ITSM_SubModuleConfigurationMaster
SP_LIST_SLA=ITSM_IR_SLA
SP_LIST_TICKETS=ITSM_IR_TransactionalRequests
SP_LIST_ACTIVITY_LOGS=ITSM_IR_ActivityLogs
SP_LIST_CONVERSATIONS=ITSM_IR_TicketConversation

# SharePoint List Names — Service Requests
SP_LIST_SR_CATEGORIZATION=ITSM_SR_Categorization
SP_LIST_SR_REQUESTS=ITSM_SR_TransactionalRequests
SP_LIST_SR_ITSERVICE=ITSM_SR_ITService
SP_LIST_SR_ACTIVITY_LOGS=ITSM_SR_ITService_ActivityLogs
SP_LIST_SR_CONVERSATIONS=ITSM_SR_ITService_TicketConversation

# JWT
JWT_SECRET=your-long-random-secret-key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NOTIFICATION_EMAIL=notifications@yourdomain.com
POWER_AUTOMATE_RESET_URL=
```

---

## SharePoint List Schema Notes

### ITSM_ExternalUsers_Registration
External user accounts. Key columns:
- `username`, `password` (compared as plain text by login), `firstName`, `lastName`, `email`, `company`
- `status` (Text): `Active` | `Inactive`. Only `Active` users can sign in.
- `sponsor` (Text): approver email for self-service registrations. New `/register` submissions set this
  to `vibhor@yoda-tech.com` and `status = Inactive`; the approval Power Automate flow sets `status = Active`
  and clears `sponsor`.
- `resetLink` (Text): one-time password-reset link (set/cleared by the forgot-password flow)

### ITSM_SR_Categorization
Hierarchical master for Service Request categorization. Key columns:
- `MasterType` (Choice): `Service Department` | `Service Type` | `System` | `Category` | `SubCategory`
- `ParentID` (Text): SharePoint item ID of the parent record
- `Title`: Display name of the item

### ITSM_SR_ITService
Main Service Request records created by this portal. Key columns:
- `service_ID`: SR number (e.g. SR1563)
- `index_ID` (Number): SharePoint item ID of the linked TransactionalRequests record — used as `parentID` for conversations and activity logs
- `externalUserEmail`: Email of the requesting user
- `externalUserDisplayName`: Display name of the requesting user
- `type_ITService`: Service type (IT Service / Cloud Service Request / Central Data Platform)
- `status`: Open | In Progress | Resolved | Closed | Rejected
- `urgency`: Critical | High | Medium | Low
- `scopeOfRequest`: Scope/description of the request
- `notes`: System name (stored here for display)

### ITSM_SR_ITService_ActivityLogs
- `parentID` (Number): Must be the `index_ID` from ITService (= TransactionalRequests item ID)
- `actor`: User display name or "System"
- `activityDetails`: Log message text

### ITSM_SR_ITService_TicketConversation
- `parentID` (Text): String of the TransactionalRequests item ID (same value as `index_ID` in ITService)
- `conversationDescription`: Message content
- `emailFromMembers`: Sender email

---

## Features

### Incident Requests
- View all submitted tickets with filtering, sorting, and column reordering
- Create tickets with system/module/submodule selection, file attachments
- Ticket detail: SLA deadlines, attachments, conversation thread, activity timeline
- Reopen closed/resolved/rejected tickets

### Service Requests
- 5-step creation wizard: Service Type → Categorization → Request Details → Additional Details → Review & Submit
- Cascading dropdowns: System → Category → Sub Category (loaded from `ITSM_SR_Categorization`)
- Service types hardcoded to: IT Service, Cloud Service Request, Central Data Platform
- SR detail: conversation thread + activity timeline

### Auth
- **Microsoft SSO (internal users):** "Sign in with Microsoft" on the login page uses Entra ID
  (OpenID Connect auth-code + PKCE) against the single-tenant app registration. Only Yoda Tech
  accounts can sign in — enforced by the tenant-specific authority, the token `tid`, and an email
  domain check (`SSO_ALLOWED_DOMAIN`, default `yoda-tech.com`). SSO users skip the SharePoint
  password check. Requires the redirect URI `${NEXT_PUBLIC_APP_URL}/api/auth/sso/callback` to be
  registered on the app registration (Web platform).
- Email + password login against `ITSM_ExternalUsers_Registration` SharePoint list
- **Self-service registration** (`/register`, "Request access" on the login page): new users submit
  first name, last name, email, company, username and password. The record is created in
  `ITSM_ExternalUsers_Registration` with `status = Inactive` and `sponsor = vibhor@yoda-tech.com`.
  A Power Automate flow routes an approval to the sponsor; on approval it sets `status = Active`
  and clears `sponsor`, after which the user can sign in. Login blocks any non-`Active` account.
- Forgot password / reset password via Power Automate flow
- JWT session stored in HTTP-only cookie

---

## Project Structure

```
src/
  app/
    (auth)/          # Login, forgot-password, reset-password pages
    (portal)/        # Authenticated portal pages
      dashboard/
      tickets/       # Incident request list + create + detail
      service-requests/  # SR list + create + detail
    api/
      auth/          # Login, logout, forgot-password, reset-password
      tickets/       # Incident CRUD + conversations
      service-requests/  # SR CRUD + conversations
  components/
    layout/          # Header, Sidebar
    tickets/         # TicketTable, ConversationSection, ActivityTimelineSection, ReopenTicketButton
    ui/              # Button, Input, Select, Badge, Alert, Spinner
  lib/
    auth/            # Session management (JWT)
    graph/           # Microsoft Graph API clients
      client.ts      # Base graphFetch helper
      tickets.ts     # Incident request data layer
      serviceRequests.ts  # Service request data layer
      masters.ts     # System/module master lookups (cached)
      auth.ts        # User auth against SharePoint
```
