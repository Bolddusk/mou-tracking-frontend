# Step 2 — Sector Lead Review + Super Admin APIs

**Backend:** `http://localhost:5000`  
**Auth:** `Authorization: Bearer <token>`

Paste this document into your frontend Cursor chat to build Sector Lead + Super Admin dashboards.

---

## Flow

```
Party A submits opportunity (status = submitted)
        ↓
Sector Lead (matching sector) sees it in their queue
        ↓
Approve → status = approved
   OR
Reject  → status = rejected (comment required)
        ↓
Super Admin sees ALL proposals (every status, every sector)
        ↓
Super Admin can also approve/reject ANY submitted proposal (no sector limit)
```

### Role permissions

| Action | Super Admin | Sector Lead |
|--------|-------------|-------------|
| Sab sectors ki proposals dekhna | ✅ `GET /api/proposals/all` | ❌ sirf apna sector (`GET /api/proposals/sector-lead`) |
| Kisi bhi proposal ki detail | ✅ `GET /api/proposals/:id` | ✅ apne sector ki (not draft) |
| Approve | ✅ `PATCH /api/proposals/:id/approve` — **kisi bhi sector** | ✅ sirf apne sector ki submitted |
| Reject | ✅ `PATCH /api/proposals/:id/reject` — **kisi bhi sector** | ✅ sirf apne sector ki submitted |

**Farq:** Sector Lead sirf `user.sector === proposal.sector` wali submitted proposals review kar sakta hai. Super Admin har sector ki submitted proposal approve/reject kar sakta hai.

### Status lifecycle

| Status | Meaning |
|--------|---------|
| `draft` | Party A still editing |
| `submitted` | Waiting for Sector Lead review |
| `approved` | Sector Lead approved |
| `rejected` | Sector Lead rejected |

---

## Setup (existing DB — no wipe)

```bash
cd investment-portal-backend
npm run db:migrate   # adds sector, review columns
npm run db:seed      # adds sector lead + super admin users
npm run dev
```

Fresh DB:
```bash
npm run db:init && npm run db:seed
```

---

## Test credentials

| Role | Email | Password | Notes |
|------|-------|----------|-------|
| Party A | `partya@test.com` | `password123` | Submits opportunities |
| Sector Lead | `sectorlead@test.com` | `password123` | Sector: **Energy & Power** |
| Super Admin | `superadmin@test.com` | `password123` | Sees everything |

**Login redirect hints** (in login response `redirect` field):
- `party_a` → `/dashboard/party-a`
- `sector_lead` → `/dashboard/sector-lead`
- `super_admin` → `/dashboard/super-admin`

---

## Login response (updated)

```json
{
  "token": "jwt...",
  "user": {
    "id": 2,
    "full_name": "Energy Sector Lead",
    "email": "sectorlead@test.com",
    "role": "sector_lead",
    "sector": "Energy & Power",
    "organization": "Ministry of Energy",
    "phone": "03007654321"
  },
  "redirect": "/dashboard/sector-lead"
}
```

`user.sector` is set for `sector_lead` only.

---

## APIs — Sector Lead

### GET `/api/proposals/sector-lead`

**Role:** `sector_lead`  
**Returns:** proposals where `proposal.sector = user.sector` and `status != draft`

**Query (optional):**
- `?status=submitted` — pending review (default tab)
- `?status=approved`
- `?status=rejected`

**Response 200:** array of proposals with extra fields:
```json
[
  {
    "id": 1,
    "party_a_id": 1,
    "sector": "Energy & Power",
    "proposal_title": "Solar Farm Project",
    "proposal_description": "...",
    "proposal_file_url": "http://localhost:5000/uploads/...",
    "party_b_name": "...",
    "party_b_organization": "...",
    "party_b_email": "...",
    "party_b_phone": "...",
    "party_b_country": "...",
    "mou_scope": "...",
    "mou_description": "...",
    "mou_sector": "Energy & Power",
    "mou_demand": "...",
    "mou_file_url": "http://localhost:5000/uploads/...",
    "status": "submitted",
    "sector_lead_comment": null,
    "reviewed_by": null,
    "submitted_at": "2026-06-04T10:00:00.000Z",
    "reviewed_at": null,
    "created_at": "2026-06-04T09:00:00.000Z",
    "party_a_name": "Party A Test User",
    "party_a_email": "partya@test.com",
    "party_a_organization": "Test Organization",
    "reviewed_by_name": null
  }
]
```

---

### PATCH `/api/proposals/:id/approve`

**Roles:** `sector_lead`, `super_admin`

**Rules:**
- Proposal must be `status = submitted`
- **Sector Lead:** `proposal.sector` must equal `user.sector` — wrong sector → `403`
- **Super Admin:** any sector (no sector restriction)

**Body:**
```json
{ "comment": "optional review note" }
```

**Response 200:** full updated proposal object

---

### PATCH `/api/proposals/:id/reject`

**Roles:** `sector_lead`, `super_admin`

**Same access rules as approve**

**Body:**
```json
{ "comment": "required rejection reason" }
```

**400** if comment missing

**Response 200:** full updated proposal object

---

## APIs — Super Admin

### GET `/api/proposals/all`

**Role:** `super_admin`  
**Returns:** ALL proposals (all sectors, all statuses including draft)

**Query (optional):**
- `?status=draft|submitted|approved|rejected`

**Response 200:** same proposal shape as sector-lead list (includes `party_a_name`, etc.)

---

### GET `/api/proposals/:id`

**Role:** `sector_lead` OR `super_admin`

- **Sector Lead:** only proposals in their sector, not draft
- **Super Admin:** any proposal

**Response 200:** single proposal object  
**403/404** if not allowed

---

### PATCH `/api/proposals/:id/approve` & `/reject`

**Role:** `super_admin` (same endpoints as Sector Lead)

- Any **submitted** proposal in any sector
- Approve: optional `comment`
- Reject: required `comment`

**Test:**
```bash
# Login: superadmin@test.com / password123
GET   /api/proposals/all
PATCH /api/proposals/1/approve   # kisi bhi sector ki submitted proposal
```

---

## Party A submit (updated response)

### POST `/api/proposals/submit`

**Body:** `{ "proposal_id": 1 }`

**Response 200:**
```json
{
  "proposal_id": 1,
  "status": "submitted",
  "message": "Proposal sent to sector lead for review"
}
```

Party A dashboard: show `submitted` badge (yellow/blue), `approved` (green), `rejected` (red).

---

## Frontend pages to build

### `/dashboard/sector-lead` (sector_lead only)

- Fetch `GET /api/proposals/sector-lead`
- Filter tabs: **Pending** (`?status=submitted`) | **Approved** | **Rejected** | **All**
- Table: Title | Party A | Sector | Status | Submitted Date | Actions
- **Approve** button → modal with optional comment → `PATCH .../approve`
- **Reject** button → modal with required comment → `PATCH .../reject`
- **View** → `GET /api/proposals/:id` detail modal

### `/dashboard/super-admin` (super_admin only)

- Fetch `GET /api/proposals/all`
- Filter tabs: All | Draft | Submitted | Approved | Rejected
- Table: Title | Party A | Sector | Status | Date | Actions
- **View** → `GET /api/proposals/:id` detail modal
- **Approve** / **Reject** on `submitted` rows → same `PATCH` endpoints (any sector)
- Approve modal: optional comment · Reject modal: required comment

### Auth updates

- Login redirect by `data.redirect` or `user.role`
- Protected routes:
  - `sector_lead` → only `/dashboard/sector-lead`
  - `super_admin` → only `/dashboard/super-admin`

---

## Status badge colors (suggested)

| Status | Color |
|--------|-------|
| draft | gray |
| submitted | yellow / blue |
| approved | green |
| rejected | red |

---

## Error format

```json
{ "error": "message" }
```

| Code | When |
|------|------|
| 401 | No/invalid token |
| 403 | Wrong role or wrong sector |
| 400 | Missing comment, invalid filter |
| 404 | Proposal not found |

---

## Axios examples

```js
// Sector lead — pending queue
const { data } = await client.get('/api/proposals/sector-lead', {
  params: { status: 'submitted' }
})

// Approve
await client.patch(`/api/proposals/${id}/approve`, { comment: 'Looks good' })

// Reject
await client.patch(`/api/proposals/${id}/reject`, { comment: 'Incomplete MOU' })

// Super admin — everything
const { data } = await client.get('/api/proposals/all')

// Super admin — approve any sector (submitted only)
await client.patch(`/api/proposals/${id}/approve`, { comment: 'Approved by admin' })

// Detail
const { data } = await client.get(`/api/proposals/${id}`)
```

---

## Matching rule

Sector Lead sees proposals where:

```
proposal.sector === user.sector
```

Example: Party A submits with sector **"Energy & Power"** → only Sector Lead assigned **Energy & Power** sees it.

To test: submit as `partya@test.com` with sector **Energy & Power**, then login as `sectorlead@test.com`.

---

## Step 3 (not built yet)

- Admin / Regional Focal Point dashboards
- Party B login
- Forward to Chinese side
- Matching algorithm
- Engagement rooms
