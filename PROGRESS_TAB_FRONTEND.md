# Progress Tab — Frontend Integration

**Replaces:** "Activities" tab terminology and approval workflow  
**Backend:** `http://localhost:5000` (or production API host)  
**Auth:** `Authorization: Bearer <token>`

---

## Summary of changes

| Before | After |
|--------|-------|
| Tab label **Activities** | Tab label **Progress** |
| Manual entry → `pending` → SL approves | Auto **Recorded** — no approval |
| MOU field edits separate | Progress fields on MOU → auto row in Progress tab |
| Card/timeline UI | **Table** (Excel-like) + download |
| Approve / Reject buttons | **Remove** |

---

## One-time migration (server)

```bash
npm run db:migrate:progress-no-approval
```

Adds `recorded` status, `source`, `synced_fields`; converts old pending rows to recorded.

---

## 1. List progress updates (table data)

```
GET /api/proposals/:id/activities
```

Same URL for backward compatibility — response shape expanded.

**Response:**

```json
{
  "progress_updates": [
    {
      "id": 12,
      "progress_date": "2026-07-06",
      "activity_date": "2026-07-06",
      "title": "MOU progress fields updated",
      "description": "Progress: in progress → completed\nBottleneck: nil → license pending",
      "status": "recorded",
      "status_label": "Recorded",
      "source": "mou_field_sync",
      "source_label": "MOU fields",
      "synced_fields": [
        { "field": "executive_summary.progress", "label": "Progress", "old_value": "in progress", "new_value": "completed" }
      ],
      "added_by_name": "Dr. Amer Mumtaz, FSRI-PARC",
      "added_by_role": "sector_lead",
      "approval_required": false,
      "can_approve": false,
      "can_reject": false,
      "comments": [],
      "sheet_row": {
        "progress_date": "2026-07-06",
        "title": "MOU progress fields updated",
        "description": "Progress: in progress → completed",
        "status": "Recorded",
        "added_by_name": "Dr. Amer Mumtaz, FSRI-PARC",
        "added_by_role": "sector_lead",
        "source": "mou_field_sync",
        "source_label": "MOU fields",
        "comments": "",
        "support_file_url": ""
      }
    }
  ],
  "activities": [],
  "approval_required": false,
  "sheet_columns": [
    { "key": "progress_date", "label": "Progress Date" },
    { "key": "title", "label": "Title" },
    { "key": "description", "label": "Description" },
    { "key": "status", "label": "Status" },
    { "key": "added_by_name", "label": "Added By" },
    { "key": "added_by_role", "label": "Added By Role" },
    { "key": "source", "label": "Source" },
    { "key": "comments", "label": "Comments" },
    { "key": "support_file_url", "label": "Support File URL" }
  ],
  "progress_rows": [],
  "count": 1,
  "pending_count": 0
}
```

**UI:** Render `progress_rows` as HTML table (or `sheet_columns` + `progress_updates`).

- Hide **Status** column badge colors for pending/approve — show `Recorded` (green/neutral)
- Hide **Approve / Reject** actions entirely when `approval_required === false`
- Rename tab: `Activities` → **Progress**
- Rename button: `Add Activity` → **Add Progress Update**
- Banner: `ACTIVITIES 1 (1 pending)` → `PROGRESS 1` (use `count`, not pending)

---

## 2. Auto-sync from Edit MOU fields

When user saves **progress-related fields** via:

```
PATCH /api/proposals/:id/fields
```

Backend auto-creates a progress row if any of these change:

| Field path | UI label |
|------------|----------|
| `executive_summary.progress` | Progress |
| `executive_summary.bottlenecks` | Bottleneck |
| `executive_summary.tentative_timeline` | Tentative Timeline |
| `executive_summary.mou_operational_status` | Status |
| `executive_summary.current_status` | Current Status |
| `executive_summary.action_taken` | Action Taken |
| `executive_summary.location` | Location |
| `proposal_description` | Outcome / Description |

**Response includes:**

```json
{
  "message": "Proposal fields updated successfully",
  "progress_sync": {
    "id": 15,
    "changes": [
      { "field": "executive_summary.progress", "label": "Progress", "old_value": "in progress", "new_value": "completed" }
    ]
  }
}
```

**Frontend after save:**
1. Refetch `GET /api/proposals/:id/activities` OR append new row from `progress_sync`
2. Refresh Progress tab table

### Reverse sync (Progress edit → MOU Details)

When user edits a `mou_field_sync` row description (e.g. `Progress: 1 → 11`), backend updates `executive_summary` and related MOU fields.

`PATCH /api/activities/:activityId` response:

```json
{
  "mou_sync": {
    "synced": true,
    "mou_fields": {
      "progress": "11",
      "bottlenecks": "nil1"
    }
  }
}
```

**Frontend after save:** if `mou_sync.synced === true`, refetch `GET /api/proposals/:id` so MOU Details tab shows updated values (Progress table refetch alone is not enough).

**Synced row defaults:**
- `title`: `"MOU progress fields updated"`
- `description`: `"Progress: old → new"` (one line per field)
- `source`: `mou_field_sync`
- `status`: `recorded`

---

## 3. Add manual progress update

```
POST /api/proposals/:id/activities
```

**Body:**

```json
{
  "activity_date": "2026-07-06",
  "title": "Site visit completed",
  "description": "What was done",
  "support_file_url": "http://localhost:5000/uploads/proof.pdf",
  "comment": "Optional — saved as first comment"
}
```

**Response `201`:** single progress object (`status: recorded`, `approval_required: false`)

No approval step after create.

---

## 4. Download progress Excel / CSV

```
GET /api/proposals/:id/progress/export?format=xlsx
GET /api/proposals/:id/progress/export?format=csv
```

**Roles:** same as view progress (`proposals.activities.view`)

**File:** `mou-278-progress.xlsx` — sheet **"Progress Updates"** with columns matching `sheet_columns`.

**UI:** Add **Download Progress** button on Progress tab (separate from full MOU report download).

Full report (`GET /api/proposals/:id/export-report?format=xlsx`) still has Summary + Progress Updates sheets — Progress sheet uses same column layout.

---

## 5. Comments display (fixed)

**Problem:** COMMENTS column showed `Name (role) [date]: text` — too noisy for table.

**Now:**
- **Progress table** (live API): `comments_display` — plain text (`423 | loced`)
- **Expand row / tooltip:** full `comments_detail[]` with author, role, date
- **Excel / CSV export & Preview Report:** full detail per comment (backend `formatCommentsForReport()`):

```
{Name} · {role} · {YYYY-MM-DD}: {text}
```

Multiple comments joined with `\n` (Excel wrap text on).

```json
"comments_detail": [
  {
    "id": 4,
    "comment": "423",
    "commented_by_name": "Dr. Amer Mumtaz, FSRI-PARC",
    "commented_by_role": "sector_lead",
    "created_at": "2026-07-07T..."
  }
]
```

**UI:** Show `comments_display` or `sheet_row.comments` in table. Use `comments_detail` for expand row. **Preview Report** loads the same CSV as export so preview matches **Download Excel**.

**Export endpoints** (detailed comments column):

| Endpoint | Notes |
|----------|-------|
| `GET /api/proposals/:id/progress/export?format=xlsx\|csv` | Progress sheet |
| `GET /api/proposals/:id/export-report?format=xlsx` | Progress Updates sheet — same format |
| Full report CSV/PDF | Same comment format |

### Comments — kahan se add karein?

| When | API | UI |
|------|-----|-----|
| **New progress** | `POST /api/proposals/:id/activities` with optional `comment` | **Add Progress Update** form — Comment field (already wired) |
| **Existing row** | `POST /api/activities/:id/comments` `{ "comment": "..." }` | **Actions → Comment** button (not in Edit modal) |
| **View thread** | `GET /api/activities/:id/comments` or `comments_detail[]` on list | Expand row |

**ACTIONS column:** `[ Edit ] [ Delete ] [ Comment ]` — Comment opens modal → POST → refetch list.

**Edit vs Comment:**

| Action | API | Changes |
|--------|-----|---------|
| Edit | `PATCH /api/activities/:id` | Date, title, description |
| Comment | `POST /api/activities/:id/comments` | Adds comment only (multiple per row) |

**Super Admin note:** Commenting on a Sector Lead row locks it (`edit_locked`) until SA grants unlock.

---

## 6. CRUD — edit & delete progress

| Role | Edit | Delete |
|------|------|--------|
| **Super Admin / Admin** | Any progress row | Any row |
| **Sector Lead** | Own manual rows only | Own **manual** rows only |
| **Sector Lead** | Own `mou_field_sync` rows (if not locked) | ❌ cannot delete auto-sync rows |
| **Party A** | ❌ | ❌ |

### Update

```
PATCH /api/activities/:activityId
```

**Body (partial):**

```json
{
  "activity_date": "2026-07-06",
  "title": "Updated title",
  "description": "Updated description",
  "support_file_url": "https://..."
}
```

**Response:** updated progress object with `can_edit`, `can_delete`, `edit_locked`.

### Delete

```
DELETE /api/activities/:activityId
```

**Response:**

```json
{ "message": "Progress entry deleted successfully", "id": 12 }
```

### Row flags (per item in list)

```json
{
  "can_edit": true,
  "can_delete": false,
  "edit_locked": false,
  "unlock_requested": false,
  "can_request_unlock": false,
  "can_grant_unlock": false
}
```

Show **Edit** / **Delete** buttons only when `can_edit` / `can_delete` are true.

---

## 7. Edit lock after Super Admin comment

**Rule:** Jab **Super Admin** kisi **Sector Lead** ki progress par comment kare → woh row **locked** ho jati hai. Sector Lead tab tak edit nahi kar sakta jab tak Super Admin unlock na de.

### Flow

```
Super Admin comments on SL progress
        ↓
edit_locked = true
        ↓
Sector Lead → Request Edit Unlock
        ↓
Super Admin → Grant Edit Unlock
        ↓
edit_locked = false → SL can edit again
```

### Request unlock (Sector Lead)

```
POST /api/activities/:activityId/request-edit-unlock
```

**Body (optional):**

```json
{ "note": "Please allow me to fix the progress description" }
```

Sets `unlock_requested: true`, `can_grant_unlock: true` for Super Admin.

### Grant unlock (Super Admin / Admin)

```
PATCH /api/activities/:activityId/grant-edit-unlock
```

Clears lock + request. Sector Lead can edit again.

### UI

| State | Sector Lead sees | Super Admin sees |
|-------|------------------|------------------|
| Locked | 🔒 Locked — **Request edit access** button | 🔒 Locked — **Grant edit access** (if requested) |
| Unlock requested | "Waiting for Super Admin approval" | **Grant edit access** button |
| Unlocked | Edit / Delete enabled | Edit / Delete enabled |

---

## 8. Removed / deprecated

| Endpoint | New behaviour |
|----------|----------------|
| `PATCH /api/activities/:id/approve` | `400 Progress updates no longer require approval` |
| `PATCH /api/activities/:id/reject` | `400 Progress updates no longer require approval` |

Remove approve/reject UI from Progress tab.

**Poke flow unchanged:** `POST /api/proposals/:id/poke` still creates `Update Requested` (pending) — Party A responds separately.

---

## 9. Suggested Progress tab UI

```
┌─ Progress ─────────────────────────────────────────────┐
│  [ + Add Progress Update ]  [ Download Excel ▼ ]      │
│                                                       │
│  ┌──────────┬────────┬─────────────┬──────────┬─────┐ │
│  │ Date     │ Title  │ Description │ Added By │ Src │ │
│  ├──────────┼────────┼─────────────┼──────────┼─────┤ │
│  │ 6 Jul 26 │ MOU... │ Progress: … │ Dr. Amer │ MOU │ │
│  └──────────┴────────┴─────────────┴──────────┴─────┘ │
└───────────────────────────────────────────────────────┘
```

**Source column values:**
- `mou_field_sync` → badge **MOU fields**
- `manual` → **Manual entry**

---

## 10. Frontend code sketch

```tsx
// Comments column — plain text only
<td>{row.comments_display || row.sheet_row?.comments || '—'}</td>

// Edit / Delete / Comment / Lock
{row.can_edit && <button onClick={() => editProgress(row.id)}>Edit</button>}
{row.can_delete && <button onClick={() => deleteProgress(row.id)}>Delete</button>}
{canComment && <button onClick={() => openCommentModal(row.id)}>Comment</button>}
{row.can_request_unlock && (
  <button onClick={() => requestUnlock(row.id)}>Request edit access</button>
)}
{row.can_grant_unlock && (
  <button onClick={() => grantUnlock(row.id)}>Grant edit access</button>
)}
```

**Implemented in:** `ProposalProgressPanel.jsx`, `ProposalProgressEditModal.jsx`, `activities.js` APIs.

---

## 11. Test checklist

```bash
npm run db:migrate:progress-no-approval
npm run db:migrate:progress-edit-lock
```

1. Comments column shows `423` not `Name (role) [date]: 423`
2. SL edits own manual progress → `PATCH /api/activities/:id` works
3. SL cannot delete `mou_field_sync` rows
4. Super Admin edits/deletes any row
5. Super Admin comments on SL row → `edit_locked: true`, SL `can_edit: false`
6. SL `POST .../request-edit-unlock` → SA sees `can_grant_unlock: true`
7. SA `PATCH .../grant-edit-unlock` → SL can edit again

---

## Related

- `MOU_FULL_FIELD_EDIT_FRONTEND.md` — Edit MOU fields (triggers auto-sync)
- `STEP3_ACTIVITIES_API.md` — legacy activity API (superseded for approval flow)
