# Investment Portal — Frontend Integration Guide

Backend: **Node.js + Express + MySQL + JWT** @ `http://localhost:5000`  
Frontend: **React (Vite) + Tailwind** @ `http://localhost:5173`

---

## Environment

### Backend `.env`
```env
PORT=5000
DATABASE_URL=mysql://root:yourpassword@localhost:3306/pk_china_portal
JWT_SECRET=your-secret-min-32-chars
JWT_EXPIRES_IN=7d
CLIENT_ORIGIN=http://localhost:5173
API_HOST=http://localhost:5000
```

### Frontend `.env`
```env
VITE_API_URL=http://localhost:5000
```

---

## Setup

```bash
# Backend
cd investment-portal-backend
npm install
npm run db:init
npm run db:seed
npm run dev

# Frontend
cd investment-portal-frontend
npm install
npm run dev
```

**Test login:** `partya@test.com` / `password123`

---

## Auth

All protected routes need:
```
Authorization: Bearer <token>
```

### POST `/api/auth/register`
Party A only — role is hardcoded server-side as `party_a`.

**Body:**
```json
{
  "full_name": "string",
  "email": "string",
  "password": "string (min 6)",
  "organization": "string",
  "phone": "string"
}
```

**Response 201:**
```json
{
  "token": "jwt...",
  "user": { "id", "full_name", "email", "role", "organization", "phone" },
  "redirect": "/dashboard/party-a"
}
```

### POST `/api/auth/login`

**Body:** `{ "email", "password" }`

**Response 200:** same as register

---

## Proposals (Party A only)

See **`STEP9_PROPOSAL_ENGAGEMENT_API.md`** (11-step flow) and **`STEP8_PROPOSAL_TEMPLATE_API.md`** (pitch template steps 4–11).

### POST `/api/proposals/draft`
Partial save — send fields per step. Nested JSON: `conference_info`, `party_a_info`, `executive_summary`, `company_overview`, `project_overview`, `financials`, `investment_ask`, `contact_info`.

Key top-level fields: `engagement_type`, `party_b_entity_type`, `company_name`, `venture_name`, `sector`, `project_type`, `party_b_*`, `mou_*`.

- Omit `proposal_id` on first save → INSERT
- Include `proposal_id` on later saves → UPDATE

**Response:** `{ "proposal_id": 1, "status": "draft" }`

### POST `/api/proposals/submit`

**Body:** `{ "proposal_id": 1 }`

Validates all **11 steps**: engagement + conference, Party A/B info, pitch template (steps 4–11), MOU. Pitch deck optional; fund utilization % must total **100**.

### POST `/api/proposals/upload`
`multipart/form-data` fields: `company_logo`, `cover_image`, `proposal_file` (optional), `mou_file`

**Response:** `{ "file_url": "...", "field": "company_logo" }`

### GET `/api/proposals/:id`

Returns `display_title` = `venture_name` → `company_name` → legacy `proposal_title`.

### GET `/api/proposals/my`

**Response:** array of proposal objects for logged-in Party A user. Each item includes `poke_status` (see `STEP3_POKE_RESPONSE_API.md`).

---

## Frontend Routes

| Route | Page |
|-------|------|
| `/auth/register` | Party A registration |
| `/auth/login` | Login |
| `/dashboard/party-a` | My opportunities table (+ Poke column) |
| `/dashboard/party-b` | Party B dashboard (linked proposals + complaints) |
| `/dashboard/sector-lead` | Sector review queue (+ Poke column) |
| `/dashboard/super-admin` | All proposals (+ Poke column) |
| `/proposals/new` | 8-step MNFSR pitch template |
| `/proposals/:id` | Proposal detail + activity timeline + poke response |
| `/complaints` | Complaints list (role-specific) |
| `/complaints/new` | File complaint (Party A) |
| `/complaints/:id` | Complaint detail + review / comments |
| `/dashboard/regional-focal` | Regional Focal Point dashboard |
| `/admin/users` | User management (Super Admin) |
| `/admin/users/new` | Add user (Super Admin) |
| `/admin/users/:id` | User detail + stats (Super Admin) |

---

## localStorage Keys

| Key | Purpose |
|-----|---------|
| `auth_token` | JWT |
| `auth_user` | User JSON |
| `proposal_draft_id` | Current draft ID |
| `proposal_draft_step` | Step 1–8 |
| `proposal_form_data` | Form fields JSON |

---

## 10 Sectors

Energy & Power · Agriculture & Food · Information Technology · Textile & Garments · Mining & Minerals · Infrastructure & Construction · Healthcare & Pharma · Education & Training · Finance & Banking · Tourism & Hospitality

---

## Error Format

```json
{ "error": "message" }
```

HTTP 401 → clear auth, redirect to login.

---

## Step 2 — Sector review

See **`STEP2_SECTOR_REVIEW_API.md`** — Sector Lead + Super Admin approve/reject, file preview, `/proposals/:id` detail.

---

## Step 3 — Activities & linked poke response

See **`STEP3_ACTIVITIES_API.md`** and **`STEP3_POKE_LINKED_RESPONSE_API.md`**.

**Poke flow:**
1. Sector Lead / Super Admin → `POST /api/proposals/:id/poke`
2. Dashboard `Poke` column → amber `Poked by X · Pending`
3. Party A → **Respond to Poke** on `/proposals/:id` (past date, proof upload, comment)
4. `POST /api/activities/upload` then `POST /api/activities/:pokeActivityId/respond`
5. Answer embedded on poke row as `poke_response` (no separate timeline entry)
6. Badge → teal `Poked by X · Answered`

**Key files:** `PokeStatusBadge.jsx`, `ProposalDetail.jsx`, `api/activities.js` (`respondToPoke`)

---

## Step 4 — Complaints / grievances

See **`STEP4_COMPLAINTS_API.md`** and **`STEP4_COMPLAINT_WORKFLOW_API.md`**.

**Base flow:** Party A files → Sector Lead forwards → Regional FP resolves / rejects / returns.

**Workflow:** `returned_to_sector_lead` → Sector Lead resolves for Party A or re-forwards; internal timeline (private) vs public comments.

**Key files:** `api/complaints.js`, `utils/complaintPermissions.js`, `ComplaintDetail.jsx`

**Test logins:** `rfp@test.com`, `rfp2@test.com` / `password123` (Regional Focal Point)

---

## Step 5 — User management (Super Admin)

See **`STEP5_USER_MANAGEMENT_API.md`**.

**Routes:** `/admin/users`, `/admin/users/new`, `/admin/users/:id`

**Actions:** list/filter, add user, edit profile, change role, reset password, delete (with references guard)

**Key files:** `api/users.js`, `UserRoleBadge.jsx`, `pages/admin/*`

---

## Step 5b — Party B auto-account & portal

See **`STEP5B_PARTY_B_API.md`**.

On proposal **approve**, backend auto-creates/links Party B user and emails credentials.

When email is not configured (or `RETURN_PARTY_B_CREDENTIALS_IN_RESPONSE=true`), approve response includes `party_b.credentials` — Sector Lead / Super Admin dashboards show **`PartyBCredentialsModal`**.

For **existing** Party B accounts (linked, not created): Super Admin → `/admin/users/:id` → **Issue Party B Login** → `POST /api/users/:id/issue-credentials`.

**Party B can:** view linked proposals, add activities/comments, file complaints  
**Party B cannot:** `/proposals/new`, respond to poke, approve/reject

**Login redirect:** `party_b` → `/dashboard/party-b`

**Key files:** `PartyBDashboard.jsx`, `PartyBCredentialsModal.jsx`, `UserDetail.jsx`, `SectorLeadDashboard.jsx`, `SuperAdminDashboard.jsx`

---

## Step 6 — Password change

See **`STEP6_PASSWORD_CHANGE_API.md`**.

Party B first login with temporary password → forced `/auth/change-password` before dashboard.

**APIs:** `PATCH /api/auth/change-password`, `GET /api/auth/me`

**Key files:** `pages/auth/ChangePassword.jsx`, `AuthContext.jsx` (`mustChangePassword`, `changePassword`), `ProtectedRoute.jsx`

---

## Step 7 — Regional FP ↔ Party B engagement

See **`STEP7_RFP_PARTY_B_ENGAGEMENT_API.md`**.

**Flow:** Sector Lead forwards → Regional FP tags Party B → poke / comments / docs → Party B responds → Regional FP returns with Party B docs on internal timeline.

**APIs:** `tag-party-b`, `poke-party-b`, `party-b-engagement/*`, `party-b-assigned`, `PATCH .../return`

**Key files:** `PartyBEngagementPanel.jsx`, `ComplaintDetail.jsx`, `PartyBDashboard.jsx` (RF Assignments tab), `api/complaints.js`

**Backend migration:** `npm run db:migrate:rfp-party-b`

---

## Step 8 — MNFSR pitch template (form steps 4–11)

See **`STEP8_PROPOSAL_TEMPLATE_API.md`**.

**Sections:** Cover → Executive Summary → Company → Project → Financials → Investment Ask → Contact/Pitch → MOU (Party B is step 3 in the 11-step flow).

**Removed:** `proposal_title` / `proposal_description` from form.

**Display:** `getProposalDisplayTitle()` — venture → company → legacy title.

**Key files:** `constants/proposalTemplate.js`, `FinancialsEditor.jsx`, `ProposalDetailPanel.jsx`, `utils/proposalDraft.js`

**Backend migration:** `npm run db:migrate:proposal-template`

---

## Step 9 — Engagement, conference & Party A/B (form steps 1–3)

See **`STEP9_PROPOSAL_ENGAGEMENT_API.md`**.

**11-step Party A wizard:**

| Step | Section |
|------|---------|
| 1 | G2G / B2B / B2G / G2B + conference name, date, location, host |
| 2 | Party A info (entity type, org, contact, email, phone…) |
| 3 | Party B info (entity type, name, org, email, phone, country) |
| 4–11 | Pitch template (Step 8) |

**Behaviour:** Engagement type auto-suggests Party A/B entity types (user can override). Step 1 blocks Next until type selected; conference fields appear after selection. Party A step pre-fills from logged-in user profile.

**Detail page:** Engagement badge + conference block in hero and `ProposalDetailPanel`.

**Key files:** `constants/proposalTemplate.js` (`ENGAGEMENT_TYPES`, `ENTITY_TYPES`, `suggestedEntityTypes`), `NewProposal.jsx`, `ProposalDetail.jsx`, `ProposalDetailPanel.jsx`

**Backend migration:** `npm run db:migrate:proposal-engagement`

---

## Step 10 — Proposal live chat (Socket.io)

See **`STEP10_PROPOSAL_SOCKET_CHAT_API.md`**.

**Who can chat:** Party A or Party B on **approved** proposals where `party_b_user_id` is set. Sector lead / super admin cannot join.

**UI:** Proposal detail page (`/proposals/:id`) — **Details** and **Chat** tabs. Chat tab URL: `?tab=chat`.

**Behaviour:** Messages saved to DB. History on `chat:joined` (last 100) + `GET /api/proposals/:id/messages` for pagination. Live updates via Socket.io with dedupe by message `id`.

**REST:** `GET /api/proposals/:proposalId/messages?limit=50&before=<id>`

**Dependency:** `socket.io-client`

**Backend migration:** `npm run db:migrate:proposal-chat`

**Key files:** `hooks/useProposalChat.js`, `components/proposal/ProposalChatPanel.jsx`, `api/proposals.js` (`getProposalMessages`), `ProposalDetail.jsx`

**Test:** Two browsers on approved proposal — send messages, refresh — history should persist.

---

## Step 11 — Proposal export report

See **`STEP11_PROPOSAL_EXPORT_REPORT_API.md`**.

**Who can export:** Sector Lead (own sector) and Super Admin — non-draft proposals only.

**API:** `GET /api/proposals/:id/export-report` (JSON preview) · `?format=pdf|xlsx|csv`

| Format | Use |
|--------|-----|
| PDF | Opens in new browser tab |
| Excel (.xlsx) | Download — 2 sheets (Summary + Activities) |
| CSV | Download for data import |

**UI:** Segmented **PDF | Excel | CSV** (`ProposalExportMenu`) on dashboards, proposal detail, and preview modal. **Preview Report** for JSON. URL `?export=pdf|xlsx|csv` auto-triggers export.

**Key files:** `api/proposals.js` (`downloadProposalExport`), `ProposalExportMenu.jsx`, `ProposalExportReportModal.jsx`, `ProposalDetail.jsx`
