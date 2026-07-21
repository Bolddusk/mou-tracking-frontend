# Ministry Multi-Tenancy + Power Admin (Frontend)

**Auth:** `Authorization: Bearer <token>`  
**Base API:** `/api`

Existing MOUs / conferences / users were backfilled to **MNFSR**. New records must carry a ministry.

---

## Roles (quick)

| Role | Scope | UI behaviour |
|------|--------|----------------|
| `super_admin` | All ministries | Full write + Settings + **Ministries CRUD** |
| `power_admin` | All ministries (read) | Same **views** as SA; **chat + comments** only; **hide Settings** |
| `party_a` / `party_b` / `sector_lead` / `admin` | Own `ministry_id` | Existing powers, lists scoped to their ministry |

---

## Login / `user` object

After login / `GET /api/auth/me`:

```json
{
  "id": 1,
  "role": "power_admin",
  "ministry_id": null,
  "ministry": null,
  "is_global": true
}
```

Scoped user example:

```json
{
  "role": "party_a",
  "ministry_id": 1,
  "ministry": {
    "id": 1,
    "code": "mnfsr",
    "name": "Ministry of National Food Security & Research",
    "is_active": true
  },
  "is_global": false
}
```

**FE:**
- If `role === 'power_admin'` → hide entire Settings nav
- Use `ministry` / `ministry_id` on create forms and badges

---

## 1. Ministries API

### List

```
GET /api/ministries
```

Who: Super Admin, Power Admin, Admin, Sector Lead, Party A (for create dropdowns)

SA inactive too: `GET /api/ministries?all=1`

```json
{
  "data": [
    { "id": 1, "code": "mnfsr", "name": "Ministry of National Food Security & Research", "is_active": true }
  ],
  "total": 1
}
```

### CRUD (Super Admin only)

```
POST   /api/ministries          { "code": "power", "name": "Ministry of Energy" }
PATCH  /api/ministries/:id      { "name": "...", "code": "...", "is_active": false }
DELETE /api/ministries/:id
```

- Cannot delete `mnfsr`
- If in use → `400` with `usage: { users, proposals, conferences }` — deactivate instead

**Settings UI:** new tab **Ministries** (SA only).

---

## 2. Create / draft MOU

Send **`ministry_id`** on create / save draft:

```
POST /api/proposals/draft
{ "ministry_id": 1, "venture_name": "...", "conference_key": "pak-china-may-24-b2b", ... }
```

Rules:
- Required for new drafts
- Party A / SL: must be **their** ministry (or omit and backend uses theirs)
- Super Admin: pick any ministry from dropdown
- Power Admin: **cannot** create/edit proposals (`403`)
- If `conference_key` set → conference must belong to same ministry

---

## 3. Conferences

```
GET /api/conferences
GET /api/conferences?ministry_id=1   // SA / PA optional filter
```

Each conference includes `ministry_id`.

Admin create conference (Settings):

```
POST /api/admin/conferences
{ "ministry_id": 1, "conference_key": "...", "name": "..." }
```

`ministry_id` **required**.

---

## 4. Users (Settings)

### Tabs (unchanged keys + Admins includes Power Admin)

| Tab | `?tab=` |
|-----|---------|
| Party A | `party_a` |
| Party B | `party_b` |
| Sector Leads | `sector_lead` |
| Admins | `admins` → `super_admin`, `admin`, `power_admin` |

```
GET /api/users?tab=party_a
GET /api/users?tab=admins&ministry_id=1   // SA/PA optional ministry filter
GET /api/users/tabs
GET /api/users/roles
```

List response shape:

```json
{
  "data": [ { "id": 1, "role": "party_a", "ministry_id": 1, ... } ],
  "tabs": [ { "key": "party_a", "label": "Party A", "count": 24 } ],
  "total": 24,
  "ministry_id": null
}
```

### Create user

```json
{
  "full_name": "...",
  "email": "...",
  "password": "...",
  "role": "sector_lead",
  "ministry_id": 1,
  "sector": "Seed Sales"
}
```

- `party_a` / `party_b` / `sector_lead` / `admin` → **`ministry_id` required**
- `super_admin` / `power_admin` → no ministry (omit / null)

Show **Ministry** column in Users table.

Roles dropdown: no Investor / Focal Point.

---

## 5. Power Admin capabilities (proposal detail)

Use `capabilities` from proposal detail:

| Cap | Power Admin |
|-----|-------------|
| View MOU / companies / lists / reports | yes |
| `can_send_chat` | yes (approved MOU) |
| `can_comment` | yes (activity comments) |
| `can_approve` / `can_reject` | false |
| `can_edit_fields` / upload / delete MOU | false |
| Settings / users / sectors / ministries write | hide / blocked |

Chat: same as SA for join/send (`conversationId` etc. — see `MOU_CHAT_INBOX_FRONTEND.md`).

---

## 6. Party A / B email → account (Companies tab)

When email is saved and account is provisioned:

- New user → **same ministry as the MOU**
- Existing email, **same ministry** → link OK
- Existing email, **different ministry** → **400**

```json
{
  "error": "This email is already registered under a different ministry",
  "code": "ministry_email_conflict"
}
```

Show a clear toast / inline error — do not treat as generic failure.

---

## 7. Proposal lists / filters

```
GET /api/proposals/all
GET /api/proposals/all?ministry_id=1
GET /api/proposals/filter-options?ministry_id=1
```

- SA / PA: optional ministry filter (global by default)
- Sector Lead: auto own ministry only
- Show ministry name on MOU cards/rows when useful (especially for SA/PA)

---

## FE checklist

- [ ] Login: store `ministry_id`, `ministry`, `is_global`
- [ ] Settings → Ministries CRUD (SA only)
- [ ] Hide Settings for `power_admin`
- [ ] MOU create: Ministry dropdown + send `ministry_id`
- [ ] Conference create: require `ministry_id`
- [ ] Users: ministry column + required on create (scoped roles)
- [ ] Admins tab shows Power Admin
- [ ] Handle `ministry_email_conflict` on party contacts
- [ ] Power Admin: chat + comments only; no write actions
- [ ] Optional SA/PA filter: `ministry_id` on `/proposals/all` and `/users`

---

## Backend setup (deploy)

```bash
npm run db:migrate:ministries
npm run db:sync:role-permissions
```
