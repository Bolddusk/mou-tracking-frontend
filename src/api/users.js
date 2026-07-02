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

export async function getUserRoles() {
  const response = await client.get('/api/users/roles')
  return response.data
}

export async function listUsers(params = {}) {
  const response = await client.get('/api/users', { params })
  return response.data
}

export function parseUsersList(data) {
  if (Array.isArray(data)) return data
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
