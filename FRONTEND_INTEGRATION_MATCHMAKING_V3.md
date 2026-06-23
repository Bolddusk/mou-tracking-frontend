# Frontend Integration — Matchmaking V3 (Multi-Country)

**Base URL:** `http://localhost:5000` (or `VITE_API_URL`)  
**Base path:** `/api/matchmaking`  
**Auth:** `Authorization: Bearer <token>`

> V3 replaces country-specific Pakistan/China routes with unified `mm_proposals` + `mm_matches`.  
> Direct MOUS (`/api/proposals/*`) is unchanged and separate.

---

## 1. API endpoints

### Proposals (`mm_proposals`)

| Method | Path | Role(s) | Request body | Response |
|--------|------|---------|--------------|----------|
| `POST` | `/api/matchmaking/proposals/draft` | `party_a`, `investor`, `super_admin` | `{ proposal_id?, country, sector, title, description, investment_amount, keywords[], side: "side_a"\|"side_b", file_url?, party_a_id? \| investor_id? }` | `{ proposal_id, status: "draft", created_on_behalf_of? }` |
| `POST` | `/api/matchmaking/proposals/submit` | submitter roles | `{ proposal_id }` | `{ message, proposal_id, status: "submitted" }` |
| `POST` | `/api/matchmaking/proposals/upload` | submitter roles | multipart: `proposal_file` | `{ file_url }` |
| `GET` | `/api/matchmaking/proposals/my` | `party_a`, `investor` | query: `?status=` | `{ proposals: [...], count }` |
| `GET` | `/api/matchmaking/proposals/focal-point` | `focal_point`, `regional_focal_point`, `sector_lead`, `super_admin` | query: `?status=&sector=` | `{ proposals: [...], count }` |
| `GET` | `/api/matchmaking/proposals/forwarded-to-me` | `sector_lead`, `super_admin` | query: `?status=` | `{ proposals: [...], count }` |
| `GET` | `/api/matchmaking/proposals/all-for-matching` | `sector_lead`, `super_admin` | query: `?sector=` | `{ side_a: [...], side_b: [...] }` |
| `GET` | `/api/matchmaking/proposals/:id` | owner + review roles | — | `{ proposal: { id, country, sector, title, description, investment_amount, keywords, side, status, file_url, submitter_name, ... } }` |
| `PATCH` | `/api/matchmaking/proposals/:id/shortlist` | `focal_point`, `sector_lead`, `super_admin` | `{ comment? }` | `{ message, proposal }` |
| `PATCH` | `/api/matchmaking/proposals/:id/reject` | review roles | `{ comment }` (required) | `{ message, proposal }` |
| `PATCH` | `/api/matchmaking/proposals/:id/forward` | `focal_point`, `sector_lead`, `super_admin` | `{ comment?, target_sector? }` | `{ message, proposal }` |

### Matches (`mm_matches`)

| Method | Path | Role(s) | Request body | Response |
|--------|------|---------|--------------|----------|
| `POST` | `/api/matchmaking/matches` | `sector_lead`, `super_admin` | `{ side_a_proposal_id, side_b_proposal_id, comment? }` | `{ match_id, engagement_proposal_id, match, message, party_b? }` |
| `GET` | `/api/matchmaking/matches/my` | `sector_lead`, `party_a`, `investor` | `?status=` | `{ matches: [...] }` |
| `GET` | `/api/matchmaking/matches/all` | `super_admin` | `?status=` | `{ matches: [...] }` |
| `GET` | `/api/matchmaking/matches/:id` | match participants + SL + SA | — | `{ match: { id, sector, status, mou_status, side_a_proposal, side_b_proposal, engagement_proposal_id, ... } }` |
| `PATCH` | `/api/matchmaking/matches/:id/approve` | `sector_lead`, `super_admin` | `{ comment? }` | `{ message, match }` |
| `PATCH` | `/api/matchmaking/matches/:id/reject` | `sector_lead`, `super_admin` | `{ comment }` | `{ message, match }` |
| `GET` | `/api/matchmaking/engagement/:engagementProposalId/match` | engagement participants | — | `{ match }` |

### MOU (reuses Direct MOUS engagement row)

| Method | Path | Role(s) | Notes |
|--------|------|---------|-------|
| `GET` | `/api/matchmaking/matches/:id/mou` | parties + SL + SA | MOU fields + file |
| `PATCH` | `/api/matchmaking/matches/:id/mou` | parties + SL + SA | multipart/text MOU update |
| `GET` | `/api/matchmaking/matches/:id/mou/status` | all match viewers | ack status |
| `PATCH` | `/api/matchmaking/matches/:id/mou/acknowledge` | party_a, party_b | acknowledgment |
| `GET` | `/api/matchmaking/matches/:id/mou/versions` | SL + SA | version history |
| `PATCH` | `/api/matchmaking/matches/:id/close-deal` | `sector_lead`, `super_admin` | after MOU signed |

---

## 2. Frontend routes → API mapping

| Route | Page | API calls |
|-------|------|-----------|
| `/matchmaking/new` | `NewMmProposal.jsx` | `POST .../draft`, `POST .../submit`, `POST .../upload` |
| `/matchmaking/my-proposals` | `MmMyProposalsDashboard.jsx` | `GET .../proposals/my` |
| `/matchmaking/:id` | `MmProposalDetail.jsx` | `GET .../proposals/:id` |
| `/matchmaking/focal-point` | `MmFocalPointDashboard.jsx` | `GET .../focal-point`, `PATCH .../shortlist\|reject\|forward` |
| `/matchmaking/forwarded` | `MmForwardedDashboard.jsx` | `GET .../forwarded-to-me` |
| `/matchmaking/board` | `MmMatchingBoard.jsx` | `GET .../all-for-matching`, `POST .../matches` |
| `/matchmaking/matches` | `MmMatchesDashboard.jsx` | `GET .../matches/my` or `.../matches/all` (SA) |
| `/matchmaking/matches/:id` | `MmMatchDetail.jsx` | `GET .../matches/:id` |
| `/matchmaking/matches/:id/mou` | `MmEngagementMou.jsx` | `GET engagement/.../match` or `GET matches/:id`, MOU endpoints |
| `/matchmaking/engagement/:id/mou` | `MmEngagementMou.jsx` | `GET .../engagement/:id/match` |
| `/proposals/:id` | `ProposalDetail.jsx` | Direct MOUS engagement (chat/activities) — `engagement_proposal_id` from match |

**Super Admin oversight** (same components, `adminOversight` prop):

| Route | API |
|-------|-----|
| `/matchmaking/admin/my-proposals` | `GET .../focal-point` (all sectors) |
| `/matchmaking/admin/focal-point` | `GET .../focal-point` |
| `/matchmaking/admin/forwarded` | `GET .../forwarded-to-me` |
| `/matchmaking/admin/board` | `GET .../all-for-matching` |
| `/matchmaking/admin/matches` | `GET .../matches/all` |
| `/matchmaking/admin/:id` | `GET .../proposals/:id` |

---

## 3. Role → post-login redirect

| Role | Redirect path |
|------|----------------|
| `party_a` | `/dashboard/party-a` |
| `party_b` | `/dashboard/party-b` |
| `sector_lead` | `/dashboard/sector-lead` |
| `super_admin` | `/dashboard/super-admin` |
| `regional_focal_point` | `/dashboard/regional-focal` (complaints); sidebar **Review Queue** → `/matchmaking/focal-point` |
| `investor` | `/matchmaking/my-proposals` |
| `focal_point` | `/matchmaking/focal-point` |

Sidebar also exposes matchmaking links per role (see `DashboardLayout.jsx`).

---

## 4. Status lifecycle (text)

```
draft
  → submit → submitted
  → focal_point/sector_lead shortlist → shortlisted
  → focal_point/sector_lead reject → rejected
  → focal_point/sector_lead forward → forwarded
  → sector_lead picks side_a + side_b on board → matched (mm_match row)
  → match creates proposals.id engagement row → chat / activities / MOU
  → mou signed → deal_closed (optional close-deal)
```

---

## 5. Match → engagement → MOU flow

1. Sector Lead selects Side A + Side B on **Matching Board** → `POST /api/matchmaking/matches`.
2. Backend creates `mm_matches` row and a **new row in `proposals`** (`engagement_proposal_id`) linking both sides — same chat/activity/MOU stack as Direct MOUS.
3. Frontend opens `/proposals/{engagement_proposal_id}` for chat & activities.
4. MOU UI: `/matchmaking/matches/{match_id}/mou` or `/matchmaking/engagement/{engagement_proposal_id}/mou` → `MmEngagementMou` → `MmMouPanel` / `MouAcknowledgmentPanel`.
5. MOU endpoints use **match id** (`/api/matchmaking/matches/:id/mou/*`), not mm_proposal id.

---

## 6. Breaking changes vs Pakistan/China V2

| Old | V3 |
|-----|-----|
| `/api/matchmaking/pakistan/*`, `/china/*`, `/fop/china/*` | `/api/matchmaking/proposals/*` and `/matches/*` |
| Role `chinese_investor` | Role `investor` |
| China FOP `regional_focal_point` for MM | Role `focal_point` for MM review queue |
| Status `forwarded_to_china`, `forwarded_to_pakistan` | Single status `forwarded` |
| Routes `/matchmaking/pakistan/*`, `/china-investor/*`, `/fop/china/*` | `/matchmaking/new`, `/my-proposals`, `/focal-point`, etc. |
| `pkProposalId` / `chinaProposalId` in match create | `side_a_proposal_id` / `side_b_proposal_id` |
| PK/China multi-step wizards in `NewProposal.jsx` | Matchmaking form in `NewMmProposal.jsx` only |
| `mm_pakistan_proposals` / `mm_china_proposals` tables (backend) | Unified `mm_proposals` |

Direct MOUS (`NewProposal.jsx`, `/proposals/*`) is **unchanged**.

---

## 7. Test credentials (from seed — verify after `npm run db:seed`)

| Role | Email | Password | Notes |
|------|-------|----------|-------|
| Party A (Side A) | `partya@test.com` | `password123` | Creates side_a proposals |
| Investor (Side B) | `investor@test.com` | `password123` | Was `chinese_investor` in V2 seed |
| Focal Point / RFP | `rfp@test.com` | `password123` | Seed role `regional_focal_point` — use sidebar **Review Queue** or `/matchmaking/focal-point` |
| Sector Lead | `sectorlead@test.com` | `password123` | Sector: Agri-chemicals & Inputs |
| Super Admin | (see backend seed) | `password123` | Full oversight |

> Re-run backend V3 migrations/seeds if roles or endpoints 404.

---

## Frontend source map

- API client: `src/api/matchmaking.js`
- Constants: `src/constants/matchmaking.js`, `src/constants/adminRoutes.js`
- Draft persistence: `src/utils/mmProposalDraft.js`
- Status badge: `src/components/matchmaking/MmProposalStatusBadge.jsx`
