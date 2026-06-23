# Step 12C — Matchmaking: China RFP Views Forwarded Pakistan Proposals

**Backend:** `http://localhost:5000`  
**Base path:** `/api/matchmaking`  
**Auth:** `Authorization: Bearer <token>`

> **Prerequisite:** Step 12B — proposal `forwarded_to_china` and assigned to this RFP user.

---

## No new migration

Uses existing `mm_pakistan_proposals` columns from Step 12B.

---

## Test credentials

| Role | Email | Password |
|------|-------|----------|
| China RFP | `rfp@test.com` | `password123` |
| Sector Lead (forwarded from) | `sectorlead@test.com` | `password123` |

---

## APIs

### 1. List forwarded Pakistan proposals

```
GET /api/matchmaking/rfp/pakistan
GET /api/matchmaking/rfp/pakistan?sector=Agri-chemicals%20%26%20Inputs
```

**Role:** `regional_focal_point` only

Returns proposals where:
- `forwarded_to_rfp` = logged-in RFP user id
- `status` = `forwarded_to_china`

**Example response:**

```json
[
  {
    "id": 2,
    "party_a_name": "Party A — Ali Khan",
    "party_a_email": "partya@test.com",
    "sector": "Agri-chemicals & Inputs",
    "venture_name": "PK Matchmaking — GreenTech Agri JV",
    "company_name": "GreenTech Pakistan",
    "status": "forwarded_to_china",
    "forwarded_at": "2026-06-08T14:00:00.000Z",
    "shortlisted_by_name": "Alam Zeb Khan",
    "engagement_type": "B2B",
    "conference_info": { ... },
    "party_a_info": { ... },
    "executive_summary": { ... },
    "company_overview": { ... },
    "project_overview": { ... },
    "financials": { ... },
    "investment_ask": { ... },
    "contact_info": { ... }
  }
]
```

---

### 2. Proposal detail (read-only)

```
GET /api/matchmaking/pakistan/:id
```

**Role:** `regional_focal_point` — only if proposal forwarded to **this** RFP.

Full template fields, same shape as Sector Lead detail view.

---

## Frontend UI (China RFP dashboard)

**Route:** e.g. `/matchmaking/rfp/pakistan`

1. On login as `regional_focal_point` → show **Pakistan Proposals** section
2. List from `GET /api/matchmaking/rfp/pakistan`
3. Optional sector filter dropdown (unique sectors from list, or free-text)
4. Card/table: `venture_name`, `company_name`, `sector`, `party_a_name`, `forwarded_at`
5. Click → detail page `GET /api/matchmaking/pakistan/:id` (read-only)

**Do not** use legacy `/api/proposals` screens.

---

## Postman test

```
# 1. Login as RFP
POST /api/auth/login
{ "email": "rfp@test.com", "password": "password123" }

# 2. List (must have forwarded proposal from Step 12B)
GET /api/matchmaking/rfp/pakistan
Authorization: Bearer <token>

# 3. Detail
GET /api/matchmaking/pakistan/2
Authorization: Bearer <token>
```

---

## Errors

| Code | Message |
|------|---------|
| 403 | Proposal not forwarded to you |
| 404 | Proposal not found |

---

**Next step (12D):** China RFP uploads Chinese-side proposal (`POST /api/matchmaking/rfp/china`).
