# MOU Change Logs — Frontend Integration

Audit trail for every MOU (proposal): who changed what, with before/after values.

---

## Who can view

| Role | Dashboard tab API | Scope |
|------|-------------------|--------|
| Super Admin / Admin | `GET /change-logs/recent` | All MOUs, all changes |
| Sector Lead | `GET /change-logs/sector` | Jurisdiction MOUs (default: everyone's changes) |
| Party A / others | `GET /change-logs/mine` | Only their own changes |
| Any (MOU detail tab) | `GET /proposals/:id/change-logs` | Per MOU; non-admin sees `viewer_scope: own` |

Load filter dropdowns once per page:

```
GET /api/proposals/change-logs/filter-options
```

Response: `sector_leads[]`, `sectors[]`, `mou_statuses[]`, `changed_by_roles[]`, `scoped_sectors` (sector lead).

---

## Filter bar (implemented)

### Super Admin / Admin

`[Search q] [Sector Lead ▼] [Sector ▼] [Changed By Role ▼] [MOU Status ▼] [From] [To] [Clear]`

- **Search `q`** — company, name, or MOU ID (no separate MOU ID field)
- **MOU Status** — `mou_status` from `mou_statuses`: Active / Inactive / Execution

### Sector Lead

Same filters **except Sector Lead dropdown**, plus **☑ Only my changes** (`mine_only=true`).

---

## List APIs

### Recent (Super Admin / Admin)

```
GET /api/proposals/change-logs/recent?limit=50
GET /api/proposals/change-logs/recent?sector_lead_id=33&mou_status=active&q=eco&from=2026-07-01
```

| Filter | Query param |
|--------|-------------|
| Search (company / MOU ID) | `q` |
| Sector Lead | `sector_lead_id` |
| Sector | `sector` |
| Changed by role | `changed_by_role` |
| MOU lifecycle status | `mou_status` (`active`, `inactive`, `execution`) |
| Date from / to | `from`, `to` |
| Pagination | `limit`, `offset` |

### Sector (Sector Lead)

```
GET /api/proposals/change-logs/sector
GET /api/proposals/change-logs/sector?mou_status=active&mine_only=true
```

Same filters as admin (no `sector_lead_id`) plus `mine_only`.

### Mine (Party A / others)

```
GET /api/proposals/change-logs/mine?limit=50&offset=0
```

### Per-MOU (detail tab)

```
GET /api/proposals/:id/change-logs?limit=50&offset=0
```

---

## Filter options sample

```json
{
  "viewer_role": "super_admin",
  "sector_leads": [
    { "id": 33, "full_name": "Engr. Muhammad Asif, CEWRI-PARC", "sectors": ["Smart Farming Solutions"] }
  ],
  "sectors": ["Smart Farming Solutions", "Fruits & Vegetables Cultivation..."],
  "mou_statuses": [
    { "value": "active", "label": "Active" },
    { "value": "inactive", "label": "Inactive" },
    { "value": "execution", "label": "Execution" }
  ],
  "changed_by_roles": [
    { "value": "super_admin", "label": "Super Admin" },
    { "value": "sector_lead", "label": "Sector Lead" }
  ],
  "scoped_sectors": null
}
```

---

## Log row display

- Collapsed: user, action, summary, MOU label (list views), field preview
- Expanded: **Field | Before | → | After** from `changes[]`
- `old_value` null → `—`
- MOU detail: banner **"Showing changes you made"** when `viewer_scope === 'own'`

---

### Per-MOU (detail → Change History tab)

```
GET /api/proposals/:id/change-logs/export?format=csv
GET /api/proposals/:id/change-logs/export?format=xlsx
```

| Item | Detail |
|------|--------|
| Auth | Same as `GET /:id/change-logs` |
| Scope | Super Admin / Admin → all changes on that MOU; others → own changes only |
| Filename | `mou-318-change-logs-2026-07-06.csv` (server `Content-Disposition`) |
| Columns | Log ID, Date, MOU ID, MOU, Sector, Status, Changed By, Role, Action, Summary, Fields, Before→After |

**UI:** Change History tab → **Preview Report** (`format=csv`) and **Download Report** (`format=xlsx`).

---

## Download report (dashboard)

Same filters as the on-screen list — pass current filter query params to export.

```
GET /api/proposals/change-logs/export?format=csv
GET /api/proposals/change-logs/export?format=xlsx
GET /api/proposals/change-logs/export?format=xlsx&proposal_id=318
GET /api/proposals/change-logs/export?format=csv&sector_lead_id=33&mou_status=active&from=2026-07-01
```

| Filter | Query param |
|--------|-------------|
| Single MOU | `proposal_id` (also sent when search `q` is numeric, e.g. `318`) |
| Search (company / name) | `q` |
| Sector Lead | `sector_lead_id` |
| Sector | `sector` |
| Changed by role | `changed_by_role` |
| MOU lifecycle status | `mou_status` |
| Date from / to | `from`, `to` |

| Role | Export scope |
|------|----------------|
| Super Admin / Admin | All change logs (optional filters) |
| Sector Lead | MOUs in assigned sectors (+ `mine_only`) |
| Party A / others | Only their own changes |

**Filename (server `Content-Disposition`):**
- No filters → `mou-change-logs-general-YYYY-MM-DD.csv`
- With filters → `mou-change-logs-filtered-YYYY-MM-DD.xlsx`

**Report columns:** Log ID, Date/Time, MOU ID, MOU, Sector, MOU Status, Changed By, Role, Action, Summary, Fields Changed, Before → After — plus filter summary header.

**UI:** Change Logs tab → **Preview Report** (in-browser CSV table) and **Download Report** (CSV general / XLSX filtered) — both use current filters.

---

## Notes

- **Removed from UI:** Action filter, MOU ID field, workflow status (`draft`/`approved`)
- Auto-synced fields (`proposal_title`, conference fields) not logged on parent-only edits
- Logs append-only; historic MOUs have no retroactive logs
