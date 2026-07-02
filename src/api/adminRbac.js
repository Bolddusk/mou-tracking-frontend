import client from './client'

export async function getAdminPermissionCatalog() {
  const response = await client.get('/api/admin/rbac/permissions')
  return response.data
}

export async function getAdminRoles() {
  const response = await client.get('/api/admin/rbac/roles')
  return response.data
}

export async function getAdminRole(role) {
  const response = await client.get(`/api/admin/rbac/roles/${role}`)
  return response.data
}

export async function putAdminRolePermissions(role, permissions) {
  const response = await client.put(`/api/admin/rbac/roles/${role}`, { permissions })
  return response.data
}

export async function patchAdminRolePermissions(role, payload) {
  const response = await client.patch(`/api/admin/rbac/roles/${role}`, payload)
  return response.data
}

export async function getPermissionBundles() {
  const response = await client.get('/api/admin/rbac/permission-bundles')
  return response.data
}

export async function grantRoleBundle(role, payload) {
  const response = await client.post(`/api/admin/rbac/roles/${role}/grant-bundle`, payload)
  return response.data
}
