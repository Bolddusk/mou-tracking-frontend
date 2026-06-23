# Step 12 — Pakistan–China Matchmaking Pipeline (Separate Flow)

**Base URL:** `http://localhost:5000`  
**Namespace:** `/api/matchmaking` — **completely separate** from legacy `/api/proposals`  
**Migration (run once):** `npm run db:migrate:matchmaking`

---

## Architecture

| Layer | Legacy direct flow | Matchmaking flow |
|-------|-------------------|------------------|
| APIs | `/api/proposals/*` | `/api/matchmaking/*` |
| Tables | `proposals` | `mm_pakistan_proposals`, `mm_china_proposals`, `mm_matches` |
| UI | Existing proposal screens | **New separate UI** |
| Party B at submit | Required | **Not required** |
| MOU at submit | Required | **End of pipeline** (after match) |
| Chat / Activities | After SL approve | After **match approve** → uses **shared** `/api/proposals/:engagement_proposal_id/*` |

When Pakistan Sector Lead **approves a match**, backend creates an **engagement proposal** in the main `proposals` table and returns `engagement_proposal_id`. From that point:

- **Chat:** Socket.io + `GET /api/proposals/:id/messages` (Step 10)
- **Activities:** `POST/GET /api/proposals/:proposalId/activities` (Step 3)
- **MOU upload:** `PATCH /api/matchmaking/matches/:id/mou` (writes to engagement proposal)

---

## Status flow

### Pakistan proposal (`mm_pakistan_proposals`)

```
draft → submitted → shortlisted → forwarded_to_china → matched
                 ↘ rejected
```

### China proposal (`mm_china_proposals`)

```
active (uploaded by RFP)
```

### Match (`mm_matches`)

```
pending_sl_review → approved | rejected
```

---

## Auth

All endpoints require:

```
Authorization: Bearer <token>
Content-Type: application/json
```

---

## 1. Party A — Pakistan proposal

### Save draft

```
POST /api/matchmaking/pakistan/draft
```

Same body shape as legacy `POST /api/proposals/draft` but **no Party B / MOU fields**.

```json
{
  "proposal_id": 1,
  "engagement_type": "B2B",
  "sector": "Agri-chemicals & Inputs",
  "company_name": "GreenTech Pakistan",
  "venture_name": "Agri Inputs JV",
  "project_type": "Greenfield",
  "conference_info": { "conference_name": "...", "conference_date": "2026-09-15", ... },
  "party_a_info": { "entity_type": "business", "organization_name": "...", ... },
  "executive_summary": { ... },
  "company_overview": { ... },
  "project_overview": { ... },
  "financials": { ... },
  "investment_ask": { ... },
  "contact_info": { ... }
}
```

### Submit

```
POST /api/matchmaking/pakistan/submit
```

```json
{ "proposal_id": 1 }
```

### Upload file

```
POST /api/matchmaking/pakistan/upload
```

Multipart: `proposal_file`, `company_logo`, or `cover_image`

### My proposals

```
GET /api/matchmaking/pakistan/my
```

### Detail

```
GET /api/matchmaking/pakistan/:id
```

### Delete (draft/rejected only)

```
DELETE /api/matchmaking/pakistan/:id
```

---

## 2. Pakistan Sector Lead

### List sector proposals

```
GET /api/matchmaking/pakistan/sector-lead
GET /api/matchmaking/pakistan/sector-lead?status=submitted
```

Statuses: `submitted`, `shortlisted`, `rejected`, `forwarded_to_china`, `matched`

### Shortlist

```
PATCH /api/matchmaking/pakistan/:id/shortlist
```

```json
{ "comment": "Strong fit for sector" }
```

### Reject

```
PATCH /api/matchmaking/pakistan/:id/reject
```

```json
{ "comment": "Does not meet criteria" }
```

### Forward to China Regional FOP

```
PATCH /api/matchmaking/pakistan/:id/forward-china
```

```json
{ "regional_focal_point_id": 5 }
```

### Pending matches for review

```
GET /api/matchmaking/matches/pending-review
```

(Only matches RFP has submitted for review)

### Approve match

```
PATCH /api/matchmaking/matches/:id/approve
```

```json
{ "comment": "Good sector alignment" }
```

**Response includes `engagement_proposal_id`** — switch UI to shared engagement APIs.

### Reject match

```
PATCH /api/matchmaking/matches/:id/reject
```

```json
{ "comment": "Sector fit insufficient" }
```

---

## 3. China Regional FOP

### View forwarded Pakistan proposals

```
GET /api/matchmaking/rfp/pakistan
GET /api/matchmaking/rfp/pakistan?sector=Agri-chemicals%20%26%20Inputs
```

### Upload China proposal

```
POST /api/matchmaking/rfp/china
```

```json
{
  "engagement_type": "B2B",
  "sector": "Agri-chemicals & Inputs",
  "company_name": "SinoAgri Corp",
  "venture_name": "Fertilizer Tech JV",
  "project_type": "Brownfield",
  "party_b_entity_type": "business",
  "party_b_name": "Li Wei",
  "party_b_organization": "SinoAgri Corp",
  "party_b_email": "liwei@china-agri.cn",
  "party_b_phone": "+86-138-0000-0000",
  "party_b_country": "China",
  "executive_summary": { ... },
  "company_overview": { ... },
  "project_overview": { ... },
  "financials": { ... },
  "investment_ask": { ... },
  "contact_info": { ... }
}
```

### List own China proposals

```
GET /api/matchmaking/rfp/china
GET /api/matchmaking/rfp/china?sector=...
```

### Create match (same sector)

```
POST /api/matchmaking/rfp/matches
```

```json
{
  "pk_proposal_id": 1,
  "china_proposal_id": 2
}
```

### Submit match to Pakistan SL for review

```
PATCH /api/matchmaking/rfp/matches/:id/submit-review
```

### List own matches

```
GET /api/matchmaking/rfp/matches
```

---

## 4. MOU (after match approved)

```
PATCH /api/matchmaking/matches/:id/mou
```

JSON or multipart with `mou_file`:

```json
{
  "mou_scope": "Technology transfer",
  "mou_description": "...",
  "mou_sector": "Agri-chemicals & Inputs",
  "mou_demand": "..."
}
```

---

## 5. Super Admin

### Full pipeline overview

```
GET /api/matchmaking/admin/overview
```

Returns all Pakistan proposals, China proposals, and matches.

Super Admin can also call shortlist / forward / approve / reject endpoints (same as Sector Lead).

---

## 6. Shared engagement (after match approve)

Use `engagement_proposal_id` from approve response:

| Feature | API |
|---------|-----|
| Chat (Socket) | Step 10 — `proposal:join` with `proposalId` = engagement id |
| Chat history | `GET /api/proposals/:id/messages` |
| Activities | `POST/GET /api/proposals/:proposalId/activities` |
| Export report | `GET /api/proposals/:id/export-report` |

---

## Test users

| Role | Email | Password |
|------|-------|----------|
| Party A | `partya@test.com` | `password123` |
| Sector Lead | `sectorlead@test.com` | `password123` |
| China RFP | `rfp@test.com` | `password123` |
| Super Admin | `superadmin@test.com` | `password123` |

---

## Frontend guidance

Build a **separate route group** (e.g. `/matchmaking/*`) with role-based dashboards:

1. **Party A** — create/submit Pakistan proposal (no Party B step)
2. **Sector Lead** — evaluate → shortlist/reject → forward → review matches
3. **China RFP** — view PK pool → upload CN proposals → match → send to SL
4. **After match approve** — redirect to existing engagement UI using `engagement_proposal_id`
5. **Legacy `/proposals` UI** — unchanged for direct Party B + MOU flow
