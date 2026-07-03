# Conference Report API — Frontend

## Business logic

- Sirf **reportable** conferences (`supports_report: true` in filter-options).
- **super_admin / admin** → conference ke saare non-draft MOUs.
- **sector_lead** → sirf apne `assigned_sectors` ke MOUs (backend auto-filter).
- **party_a** aur baaki roles → 403.
- Status buckets: `in_execution` | `active` | `inactive` (`executive_summary.mou_operational_status` se).
- Snapshot: group by SIFC category + sub-category + `cooperation_mode`, subtotals per category, grand total.

---

## 1. Report JSON

`GET /api/proposals/conference-report?conference_key=pak-china-sep-25-conference`

**Auth:** Bearer token — `super_admin`, `admin`, `sector_lead`

**Response (shape):**
```json
{
  "conference": {
    "key": "pak-china-sep-25-conference",
    "name": "Pak China Sep-25 Conference",
    "report_title": "Snapshot (PM's China Visit, Sept 25, B2B, MNFSR)"
  },
  "scope": { "list_scope": "all", "sector": null, "sectors": null },
  "generated_at": "2026-07-03T09:00:00.000Z",
  "proposal_count": 31,
  "snapshot": { "rows": [/* data | subtotal | grand_total */] },
  "sections": {
    "in_execution": [/* detail rows */],
    "active": [],
    "inactive": []
  }
}
```

**Sector lead scope example:**
```json
"scope": {
  "list_scope": "sector",
  "sector": null,
  "sectors": ["Agri-chemicals & Inputs", "Food Processing & Value Addition"]
}
```

**Errors:** `400` missing `conference_key` / SL without sector · `403` not reportable or no access

---

## 2. PDF (basic)

`GET /api/proposals/conference-report?conference_key=...&format=pdf`

Same RBAC. Returns `application/pdf` inline.

Template-exact PDF baad mein improve ho sakta hai; abhi snapshot + 3 sections ka summary PDF.

---

## 3. Filter options flag

`GET /api/proposals/filter-options` — har conference object mein:

```json
{ "key": "pak-china-sep-25-conference", "name": "...", "supports_report": true, "proposal_count": 31 }
```

**UI:** `supports_report === true` par "Download Conference Report" button dikhao.

---

## Reportable conference keys

- `pak-china-sep-25-conference`
- `pak-china-islamabad-agri-2026`
- `pak-china-hangzhou-agri-2026`

---

## Detail row fields

| Section | Extra fields |
|---------|----------------|
| `in_execution` | `outcome`, `action_taken` (default: "No issue was reported") |
| `active` / `inactive` | `product`, `bottlenecks` (default: "Nil") |

Common: `sr`, `pak_company`, `chinese_company`, `mou_value_usd_m`, `value_label`, `location`, `status_feedback`, `tentative_timeline`

Null display: `—` / `Nil` / `Not specified` (backend normalizes).
