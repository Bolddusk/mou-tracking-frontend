import client from './client'

export async function getSectorLeads(sector) {
  const params = sector ? { sector } : {}
  const response = await client.get('/api/users/sector-leads', { params })
  const data = response.data
  if (Array.isArray(data?.sector_leads)) return data.sector_leads
  if (Array.isArray(data)) return data
  return []
}

export async function getRegionalFocalPoints() {
  const response = await client.get('/api/users/regional-focal-points')
  return response.data
}

/** Roles allowed for create / change-role UI (API rejects investor / focal). */
export const ASSIGNABLE_USER_ROLE_VALUES = new Set([
  'party_a',
  'party_b',
  'sector_lead',
  'super_admin',
  'admin',
  'power_admin',
])

/** Roles that must carry a ministry_id on create. */
export const MINISTRY_SCOPED_USER_ROLES = new Set([
  'party_a',
  'party_b',
  'sector_lead',
  'admin',
])

export const USER_LIST_TABS = [
  { key: 'party_a', label: 'Party A' },
  { key: 'party_b', label: 'Party B' },
  { key: 'sector_lead', label: 'Sector Leads' },
  { key: 'admins', label: 'Admins' },
]

export async function getUserRoles() {
  const response = await client.get('/api/users/roles')
  return response.data
}

/** Filter GET /api/users/roles to assignable portal roles only. */
export function parseAssignableUserRoles(data) {
  const list = Array.isArray(data) ? data : Array.isArray(data?.roles) ? data.roles : []
  return list.filter((r) => ASSIGNABLE_USER_ROLE_VALUES.has(r.value || r.role || r))
}

export async function listUsers(params = {}) {
  const cleaned = {}
  for (const [key, value] of Object.entries(params || {})) {
    if (value == null) continue
    const str = String(value).trim()
    if (!str) continue
    cleaned[key] = value
  }
  const response = await client.get('/api/users', { params: cleaned })
  return response.data
}

/** Optional tab counts: GET /api/users/tabs */
export async function getUserTabs() {
  const response = await client.get('/api/users/tabs')
  return response.data
}

/** Normalize list body — supports `{ data, tab, tabs, total }` and legacy arrays. */
export function normalizeUsersListResponse(body) {
  const data = parseUsersList(body)
  return {
    data,
    tab: body?.tab ?? null,
    tabs: Array.isArray(body?.tabs) ? body.tabs : [],
    total: body?.total ?? data.length,
  }
}

/** Always returns a user array (for pickers / legacy callers). */
export function parseUsersList(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.data)) return data.data
  if (Array.isArray(data?.users)) return data.users
  return []
}

export async function getUserById(id) {
  const response = await client.get(`/api/users/${id}`)
  return response.data
}

export async function createUser(payload) {
  const response = await client.post('/api/users', payload)
  return response.data
}

export async function updateUser(id, payload) {
  const response = await client.patch(`/api/users/${id}`, payload)
  return response.data
}

export async function changeUserRole(id, role, sector) {
  const response = await client.patch(`/api/users/${id}/role`, { role, sector })
  return response.data
}

export async function resetUserPassword(id, password) {
  const response = await client.patch(`/api/users/${id}/password`, { password })
  return response.data
}

export async function issuePartyBCredentials(id) {
  const response = await client.post(`/api/users/${id}/issue-credentials`)
  return response.data
}

export async function deleteUser(id, { unlinkReferences = false } = {}) {
  const params = unlinkReferences ? { unlink_references: true } : {}
  const response = await client.delete(`/api/users/${id}`, { params })
  return response.data
}
