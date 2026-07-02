# RBAC — Backend Optional Improvements

**Frontend + backend must align on the 15 sidebar permissions only.**  
See **`RBAC_BACKEND_15_PERMISSIONS.md`** for the canonical list and migration steps.

**Frontend:** sidebar built from `src/constants/sidebarPermissions.js` (15 items).  
**These optional backend cleanups** remain useful for API/action keys.

**Related docs:** `RBAC_FRONTEND.md`, `server/utils/navCatalog.js`, `server/utils/rolePermissions.js`

---

## 1. Deduplicate `navigation` at build time

When building `rbac.navigation` from `NAV_CATALOG ∩ permissions`:

- **Do not emit the same `path` twice** (across sections or within a section).
- Normalize paths before compare: trim trailing slash, lowercase.

```js
// Pseudocode
const seen = new Set()
const items = catalog
  .filter(hasPermission)
  .filter((item) => {
    const key = normalizePath(item.path)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
```

**Why:** Super Admin with all permissions currently gets duplicate links (e.g. `MOUs (my sector)` twice). Frontend dedupes; backend should be the source of truth.

---

## 2. Map `admin.*` action keys to nav catalog entries

Frontend treats these as equivalent (any grants access):

| Action / admin key | Nav key | Sidebar label | Path |
|--------------------|---------|---------------|------|
| `admin.rbac` | `nav.permissions.manage` | Permissions | `/admin/permissions` |
| `admin.sectors` | `nav.sectors.manage` | Sectors | `/admin/sectors` |
| `admin.compliance` | `nav.compliance.audit` | Audit & Annual Returns | `/dashboard/super-admin/compliance` |
| `admin.sl_reassign` | `nav.sector_lead.reassign` | Sector Officer Change | `/dashboard/super-admin/sector-lead/handoff` |
| `admin.users` | `nav.users.manage` | Users | `/admin/users` |

**In `navCatalog.js`:** when filtering catalog items, treat `admin.rbac` as satisfying `nav.permissions.manage` (and same pattern for others above).

**Why:** Permissions UI grants `admin.rbac`; catalog may only list `nav.permissions.manage` → link missing until frontend injects it.

---

## 3. Prune redundant nav for broad roles (optional UX)

When a user has a **global** permission, omit the **scoped** nav item:

| Has | Omit from navigation |
|-----|----------------------|
| `nav.mous.all` | `nav.mous.sector` |
| `nav.opportunities.all` | `nav.mous.sector` (sector MOU list) |
| `nav.matchmaking.all_proposals` | duplicate oversight paths if canonical `/matchmaking/all` is present |

**Why:** Super Admin sidebar is very long when all 65 permissions are granted.

---

## 4. Enforce permissions on admin APIs

Verify middleware checks **action keys**, not only `super_admin` role:

| Endpoint | Required permission (any) |
|----------|---------------------------|
| `GET/PUT/PATCH /api/admin/rbac/*` | `admin.rbac` or `nav.permissions.manage` |
| `GET/POST/PATCH/DELETE /api/admin/sectors` | `admin.sectors` or `nav.sectors.manage` |
| `GET/POST /api/users` | `admin.users` or `nav.users.manage` |
| Compliance admin routes | `admin.compliance` or `nav.compliance.audit` |
| Sector lead reassign/handoff | `admin.sl_reassign` or `nav.sector_lead.reassign` |

- Grant permission → **200**
- Revoke permission → **403** (not empty list masking denial)

**Why:** Frontend shows sidebar links when permission is granted; API must match or user sees broken pages.

---

## 5. Stable `GET /api/auth/me` payload

Every login / me / permissions refresh should return:

```json
{
  "redirect": "/dashboard/super-admin",
  "user": { "id": 1, "role": "super_admin", "role_label": "Super Admin" },
  "rbac": {
    "role": "super_admin",
    "role_label": "Super Admin",
    "permissions": ["nav.opportunities.all", "admin.rbac", "..."],
    "navigation": [
      {
        "section": "OVERVIEW",
        "items": [
          { "key": "opportunities_all", "label": "All Opportunities", "path": "/dashboard/super-admin", "permission": "nav.opportunities.all" }
        ]
      }
    ],
    "context": {
      "sector": null,
      "country": null,
      "scoped_sector": null,
      "scoped_country": null
    },
    "redirect": "/dashboard/super-admin"
  }
}
```

**Checklist:**

- [ ] `navigation` is deduped (§1)
- [ ] `admin.*` grants appear in `navigation` when applicable (§2)
- [ ] `redirect` at root and/or `rbac.redirect` = first nav item path
- [ ] `GET /api/auth/permissions` returns same shape as `rbac` in login/me

---

## 6. Canonical matchmaking paths (align with frontend)

Prefer **one path per feature** in `navCatalog.js`:

| Feature | Canonical path | Legacy (avoid duplicating in nav) |
|---------|----------------|-----------------------------------|
| All MM proposals | `/matchmaking/all` | `/matchmaking/admin/my-proposals` |
| Matching board | `/matchmaking/board` | `/matchmaking/admin/board` |
| Forwarded | `/matchmaking/forwarded` | `/matchmaking/admin/forwarded` |
| Review queue | `/matchmaking/focal-point` | `/matchmaking/admin/focal-point` |
| Matches | `/matchmaking/matches` | `/matchmaking/admin/matches` |

Frontend still supports legacy routes; nav catalog should emit **one** entry per feature.

---

## Test after backend changes

1. **Super Admin** login → sidebar: no duplicate paths; reasonable section count.
2. Grant **Party A** only `admin.rbac` → `navigation` includes Permissions link; `PATCH /api/admin/rbac/roles/party_a` → 200.
3. Revoke `admin.rbac` → Permissions absent from `navigation`; admin RBAC API → 403.
4. **Sector Lead** default → no Users; grant `nav.users.manage` → Users in nav + `GET /api/users` works.
5. `GET /api/auth/me` after `PATCH` role permissions → updated `navigation` without re-login (if lightweight permissions endpoint is used).

---

## One-liner for backend team

> Dedupe nav paths at source, map `admin.*` to nav catalog entries, enforce same keys on APIs, and use canonical `/matchmaking/*` paths in the catalog.
