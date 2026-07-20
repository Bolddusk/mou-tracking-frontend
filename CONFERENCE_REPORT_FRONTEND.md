# Conference / SIFC Report API — Frontend

## Business logic

- Sirf **reportable** conferences (`supports_report: true` in filter-options).
- **No extra filters** → same as before: full conference report (role-scoped).
- **With dashboard filters** → report = **exactly the filtered list** (same query params as Opportunities table).
- Roles:

| Role | Report scope |
|------|----------------|
| `super_admin` / `admin` | All non-draft MOUs for that conference (+ filters) |
| `sector_lead` | Own assigned sectors only (+ filters) |
| `party_a` | Own linked MOUs only |
| `party_b` / `investor` | Own linked MOUs only |

---

## Endpoint

```
GET /api/proposals/conference-report
```

### Required / optional

| Param | Example |
|-------|---------|
| `conference_key` | `pak-china-may-24-b2b` — **optional**. Omit for **All conferences** (all reportable conferences, role-scoped). |

**Specific conference:**
```
GET /api/proposals/conference-report?conference_key=...&format=pdf
```

**All conferences** (backend must accept missing key):
```
GET /api/proposals/conference-report?format=pdf
```

Same Opportunities filters (`sector`, `cooperation_mode`, `sifc_category`, dates, `q`, archive…) apply in both cases.

---

### Format

### Format

| `format` | Response |
|----------|----------|
| `json` (default) | Preview JSON |
| `xlsx` | Excel download |
| `pdf` | PDF (`&download=1` for attachment) |

### Optional filters (same as list / Opportunities)

Pass **the same query string** you use for `GET /api/proposals/all` (or sector-lead list), minus `page` / `limit`:

| Param | Example | Effect |
|-------|---------|--------|
| `sector` | `Seed Sales` | Only that sector |
| `cooperation_mode` | `mou` \| `jv` \| `agreement` | Mode filter |
| `sifc_category` | `Investment Export Oriented` | SIFC category |
| `mou_lifecycle` | `active` \| `inactive` \| `execution` | Lifecycle pill |
| `date_from` / `date_to` | `2024-01-01` | `YYYY-MM-DD` on `created_at` |
| `q` | `ms group` | Search text |
| `archive` / `archive_filter` | `active` \| `archived` \| `all` | Archive scope |
| `include_deleted` / `archived_only` | `1` | Same as Opportunities list archive toggles |
| `status` | `approved` | Workflow status (rare for SIFC) |

**Rule:** Jo table mein rows dikh rahi hain (us conference + filters pe), wahi SIFC report mein aani chahiye.

---

## Frontend wiring (dashboard)

Implemented in:

- `src/utils/conferenceReportQuery.js` — `buildSifcReportQuery` / `buildConferenceReportParams` / `reportFiltersFromListParams`
- `src/api/proposals.js` — `getConferenceReport(key, filters)`, PDF/Excel download with filters
- `ConferenceReportActions` — Preview / PDF / Excel all use current Opportunities filter state
- Super Admin + Sector Lead dashboards pass `reportFilters` from `listParams`

```ts
function buildSifcReportQuery(filters: {
  conference_key: string
  sector?: string
  cooperation_mode?: string
  sifc_category?: string
  mou_lifecycle?: string
  date_from?: string
  date_to?: string
  q?: string
  archive?: string
  format?: 'json' | 'xlsx' | 'pdf'
  download?: '1'
}) {
  const params = new URLSearchParams()
  params.set('conference_key', filters.conference_key)
  params.set('format', filters.format || 'json')

  const optional = [
    'sector',
    'cooperation_mode',
    'sifc_category',
    'mou_lifecycle',
    'date_from',
    'date_to',
    'q',
    'archive',
  ] as const

  for (const key of optional) {
    const value = filters[key]
    if (value != null && String(value).trim() !== '' && String(value) !== 'all') {
      params.set(key, String(value))
    }
  }

  if (filters.download) params.set('download', filters.download)
  return params.toString()
}
```

### Examples

**General (no filters — old behaviour):**
```
GET /api/proposals/conference-report?conference_key=pak-china-may-24-b2b&format=pdf
```

**Filtered (MoU + Seed Sales):**
```
GET /api/proposals/conference-report?conference_key=pak-china-may-24-b2b&cooperation_mode=mou&sector=Seed%20Sales&format=pdf
```

---

## JSON extras

```json
{
  "conference": { "key": "...", "name": "...", "report_title": "..." },
  "scope": {
    "list_scope": "all",
    "filters_applied": true,
    "filters": {
      "conference_key": "...",
      "sector": "Seed Sales",
      "cooperation_mode": "mou",
      "sifc_category": null,
      "mou_lifecycle": null,
      "q": null,
      "date_from": null,
      "date_to": null
    }
  },
  "proposal_count": 2,
  "summary_counts": { "in_execution": 0, "active": 2, "inactive": 0 },
  "snapshot": { "rows": [] },
  "sections": { "in_execution": [], "active": [], "inactive": [] }
}
```

Use `proposal_count` / `scope.filters_applied` in UI subtitle, e.g.  
`SIFC report · 2 MOUs (filtered)` vs `SIFC report · 48 MOUs`.

---

## Buttons (dashboard)

| Button | Call |
|--------|------|
| Preview SIFC report | `format=json` then render / print (filters in URL search) |
| Download SIFC report (PDF) | `format=pdf` + same filters |
| Download SIFC report (Excel) | `format=xlsx` + same filters |

Show buttons when the user can view SIFC reports (**Super Admin / Admin / Sector Lead**) — for **All conferences** and a specific conference. Do not gate on `supports_report` alone for visibility.

| Button | Call |
|--------|------|
| Preview SIFC report | `format=json` (filters in URL; no key when All) |
| Download SIFC report (PDF) | `format=pdf` + same filters |
| Download SIFC report (Excel) | `format=xlsx` + same filters |

**Note:** All-conferences calls need backend support (`conference_key` optional). Until then the API may return 400; FE still shows the buttons and surfaces the error.
---

## Errors

| Code | When |
|------|------|
| 400 | Missing `conference_key` / invalid filter / invalid format |
| 403 | Role not allowed / conference not reportable / SL sector outside scope |
| 404 | Unknown `conference_key` |
| 503 | PDF Chromium missing — use Excel |

---

## Checklist

- [x] Preview/PDF/Excel use **same** filter state as Opportunities table
- [x] Clearing filters → full conference report again
- [ ] Sector Lead cannot pass another sector (backend)
- [ ] Party A/B only get their own MOUs in the report (backend)
- [ ] Empty filter result → empty report (0 rows), not an error
