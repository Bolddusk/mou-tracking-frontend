import { ROLES } from '../constants/sectors'
import { ADMIN_SETTINGS_SIDEBAR, ADMIN_SETTINGS_TABS } from '../constants/adminSettings'
import { SIDEBAR_PERMISSION_SECTIONS } from '../constants/sidebarPermissions'

/**
 * Equivalent permission keys — any key in a group grants the capability.
 * Backend admin.* keys and frontend nav.* keys must stay in sync here.
 */
export const PERMISSION_GROUPS = [
  ['nav.permissions.manage', 'admin.rbac'],
  ['nav.sectors.manage', 'admin.sectors'],
  ['nav.compliance.audit', 'admin.compliance'],
  ['nav.sector_lead.reassign', 'admin.sl_reassign'],
  ['nav.users.manage', 'admin.users', 'users.manage', 'users.list'],
  ['nav.complaints.all', 'nav.complaints.sector', 'nav.complaints.mine', 'nav.complaints.own', 'complaints.review', 'complaints.create'],
  ['nav.matchmaking.my_proposals'],
  ['nav.matchmaking.new_proposal', 'matchmaking.create'],
  ['nav.matchmaking.all_matches', 'nav.matchmaking.matches'],
  ['nav.proposals.new_direct', 'proposals.create'],
]

/** Legacy nav keys still stored on some roles — read-only for can(), never grant/revoke in admin UI. */
const LEGACY_NAV_READ = {
  'nav.matchmaking.my_proposals': ['nav.proposals.my'],
  'nav.opportunities.all': ['nav.mous.all'],
  'nav.complaints.all': ['nav.complaints.sector', 'nav.complaints.mine', 'nav.complaints.own'],
}

/** Admin action aliases granted alongside nav keys (not obsolete nav keys). */
export const NAV_ADMIN_GRANT_ALIASES = {
  'nav.permissions.manage': ['admin.rbac'],
  'nav.sectors.manage': ['admin.sectors'],
  'nav.compliance.audit': ['admin.compliance'],
  'nav.sector_lead.reassign': ['admin.sl_reassign'],
  'nav.users.manage': ['admin.users'],
}

export function getNavGrantKeys(navKey) {
  return [navKey, ...(NAV_ADMIN_GRANT_ALIASES[navKey] || [])]
}

function keysForPermission(permission) {
  const group = PERMISSION_GROUPS.find((g) => g.includes(permission))
  const keys = group ? [...group] : [permission]
  for (const [canonical, legacy] of Object.entries(LEGACY_NAV_READ)) {
    if (keys.includes(canonical)) keys.push(...legacy)
    if (legacy.includes(permission) && !keys.includes(canonical)) keys.push(canonical)
  }
  return [...new Set(keys)]
}

export function getPermissionAliases(permission) {
  return keysForPermission(permission)
}

export function isPermissionGranted(grantedSet, permission) {
  if (!grantedSet) return false
  const set = grantedSet instanceof Set ? grantedSet : new Set(grantedSet)
  return keysForPermission(permission).some((key) => set.has(key))
}

export function allSidebarAliasKeys(primaryKeys) {
  const keys = new Set()
  for (const primary of primaryKeys) {
    keys.add(primary)
    for (const alias of NAV_ADMIN_GRANT_ALIASES[primary] || []) keys.add(alias)
  }
  return keys
}

export function can(rbac, permission) {
  if (!permission) return true
  if (!rbac) return false
  if (rbac.role === ROLES.SUPER_ADMIN) return true
  const granted = rbac.permissions || []
  return keysForPermission(permission).some((key) => granted.includes(key))
}

export function canAny(rbac, permissions = []) {
  if (!permissions?.length) return true
  if (!rbac) return false
  if (rbac.role === ROLES.SUPER_ADMIN) return true
  return permissions.some((p) => can(rbac, p))
}

/** Build sidebar from the 15-item catalog ∩ role permissions — same logic for every role. */
export function buildSidebarNavigation(rbac) {
  if (!rbac) return []

  const sections = []

  for (const section of SIDEBAR_PERMISSION_SECTIONS) {
    if (section.hideInNav) continue

    if (section.section === 'ADMINISTRATION') {
      const firstTab = ADMIN_SETTINGS_TABS.find((tab) => canAny(rbac, tab.permissions))
      if (firstTab) {
        sections.push({
          section: section.section,
          items: [
            {
              key: ADMIN_SETTINGS_SIDEBAR.key,
              label: ADMIN_SETTINGS_SIDEBAR.label,
              path: '/admin/settings',
              permission: firstTab.permission,
            },
          ],
        })
      }
      continue
    }

    const items = []
    for (const perm of section.permissions) {
      if (!perm.path || !can(rbac, perm.key)) continue
      items.push({
        key: perm.navKey || perm.key,
        label:
          perm.key === 'nav.opportunities.all'
            ? getOpportunitiesNavLabel(rbac, perm.label)
            : perm.label,
        path: perm.path,
        permission: perm.key,
        ...(perm.end ? { end: true } : {}),
      })
    }
    if (items.length > 0) {
      sections.push({ section: section.section, items })
    }
  }

  return sections
}

export function isMatchmakingNavPath(path = '') {
  return path.includes('/matchmaking/')
}

function normalizeNavPath(path = '') {
  if (!path) return ''
  const base = String(path).split('?')[0].replace(/\/+$/, '').toLowerCase()
  return base || '/'
}

/** Same destination via legacy/admin paths — keep first occurrence only. */
const PATH_EQUIVALENT_GROUPS = [
  ['/matchmaking/all', '/matchmaking/admin/my-proposals'],
  ['/matchmaking/board', '/matchmaking/admin/board'],
  ['/matchmaking/forwarded', '/matchmaking/admin/forwarded'],
  ['/matchmaking/focal-point', '/matchmaking/admin/focal-point'],
  ['/matchmaking/matches', '/matchmaking/admin/matches'],
]

function canonicalNavPath(path) {
  const normalized = normalizeNavPath(path)
  for (const group of PATH_EQUIVALENT_GROUPS) {
    const canonical = normalizeNavPath(group[0])
    if (group.some((p) => normalizeNavPath(p) === normalized)) return canonical
  }
  return normalized
}

/** Remove duplicate sidebar links (same path or equivalent path) across all sections. */
export function dedupeNavigation(navigation = []) {
  const seenPaths = new Set()
  const result = []

  for (const section of navigation) {
    const items = []
    for (const item of section.items || []) {
      if (!item?.path) continue
      const canonical = canonicalNavPath(item.path)
      if (seenPaths.has(canonical)) continue
      seenPaths.add(canonical)
      items.push(item)
    }
    if (items.length > 0) {
      result.push({ ...section, items })
    }
  }

  return result
}

function cloneNavigation(navigation = []) {
  return navigation.map((section) => ({
    ...section,
    items: [...(section.items || [])],
  }))
}

/** Sidebar for all roles: 15-item catalog filtered by permissions (ignores API navigation blob). */
export function enrichNavigation(_navigation, rbac) {
  return buildSidebarNavigation(rbac)
}

export function flattenNavigation(navigation = []) {
  const items = []
  for (const section of navigation) {
    for (const item of section.items || []) {
      if (item.path) items.push(item)
    }
  }
  return items
}

export function resolveDashboardPath({ redirect, rbac, user }) {
  if (redirect) return redirect
  if (rbac?.redirect) return rbac.redirect
  const flat = flattenNavigation(enrichNavigation(rbac?.navigation, rbac))
  if (flat.length) return flat[0].path
  return dashboardPathForRole(user?.role || rbac?.role)
}

export function dashboardPathForRole(role) {
  if (role === ROLES.PARTY_A) return '/dashboard/party-a'
  if (role === ROLES.PARTY_B) return '/dashboard/party-b'
  if (role === ROLES.SECTOR_LEAD) return '/dashboard/sector-lead'
  if (role === ROLES.SUPER_ADMIN) return '/dashboard/super-admin'
  if (role === ROLES.ADMIN) return '/dashboard/admin'
  if (role === ROLES.REGIONAL_FOCAL_POINT) return '/dashboard/regional-focal'
  if (role === ROLES.INVESTOR) return '/matchmaking/my-proposals'
  if (role === ROLES.FOCAL_POINT) return '/matchmaking/focal-point'
  return '/auth/login'
}

export function groupPermissions(permissions = []) {
  const groups = {}
  for (const key of permissions) {
    const prefix = key.includes('.') ? key.split('.')[0] : 'other'
    if (!groups[prefix]) groups[prefix] = []
    groups[prefix].push(key)
  }
  return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
}

export function normalizePermissionCatalog(data) {
  if (Array.isArray(data?.groups)) {
    return data.groups.map((g) => ({
      group: g.key || g.group || 'other',
      label: g.label || g.key || g.group,
      permissions: (g.permissions || []).map((p) =>
        typeof p === 'string' ? { key: p, label: p } : p,
      ),
    }))
  }

  const list = data?.permissions || data?.permission_catalog || []
  if (!Array.isArray(list)) return []

  const groups = {}
  for (const entry of list) {
    const key = entry.key || entry
    if (!key) continue
    const groupKey =
      entry.group || (String(key).includes('.') ? String(key).split('.')[0] : 'other')
    if (!groups[groupKey]) {
      groups[groupKey] = { group: groupKey, label: groupKey, permissions: [] }
    }
    groups[groupKey].permissions.push({
      key: String(key),
      label: entry.label || String(key),
    })
  }

  return Object.values(groups).sort((a, b) => a.group.localeCompare(b.group))
}

export function parseAdminRolesList(data) {
  if (Array.isArray(data?.roles)) return data.roles
  if (Array.isArray(data)) return data
  return []
}

export const PROPOSALS_LIST_API = {
  ALL: '/api/proposals/all',
  SECTOR: '/api/proposals/sector-lead',
  OWN: '/api/proposals/my',
}

/** Resolved list endpoint from GET /api/auth/me — capabilities first, then context. */
export function getProposalsListApi(rbac) {
  const fromCapabilities = rbac?.capabilities?.proposals_list_api
  if (fromCapabilities) return fromCapabilities

  const fromContext = rbac?.context?.proposals_list_api
  if (fromContext) return fromContext

  const scope = rbac?.context?.list_scope
  if (scope === 'all') return PROPOSALS_LIST_API.ALL
  if (scope === 'sector') return PROPOSALS_LIST_API.SECTOR
  return PROPOSALS_LIST_API.OWN
}

/** `all` | `sector` | `own` — drives filters and list params. */
export function getProposalsListScope(rbac) {
  const scope = rbac?.context?.list_scope
  if (scope === 'all' || scope === 'sector' || scope === 'own') return scope

  const api = getProposalsListApi(rbac)
  if (api === PROPOSALS_LIST_API.ALL) return 'all'
  if (api === PROPOSALS_LIST_API.SECTOR) return 'sector'
  return 'own'
}

/** Same nav permission (`nav.opportunities.all`), scope-aware label for sidebar/page. */
export function getOpportunitiesNavLabel(rbac, fallback = 'All Opportunities') {
  const scope = getProposalsListScope(rbac)
  if (scope === 'own') return 'My Opportunities'
  if (scope === 'sector') return 'Sector Opportunities'
  return fallback
}
