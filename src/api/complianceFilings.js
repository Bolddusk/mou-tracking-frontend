import client from './client'

const multipart = { headers: { 'Content-Type': 'multipart/form-data' } }

// --- Super Admin ---

export async function getAdminComplianceMeta() {
  const response = await client.get('/api/admin/compliance-filings/meta')
  return response.data
}

export async function getAdminComplianceOverview() {
  const response = await client.get('/api/admin/compliance-filings/overview')
  return response.data
}

export async function getAdminComplianceMatrix(userId) {
  const response = await client.get(`/api/admin/compliance-filings/users/${userId}/matrix`)
  return response.data
}

export async function uploadAdminComplianceFiling(formData) {
  const response = await client.post('/api/admin/compliance-filings', formData, multipart)
  return response.data
}

export async function deleteAdminComplianceFiling(id) {
  const response = await client.delete(`/api/admin/compliance-filings/${id}`)
  return response.data
}

// --- Party A (logged-in user) ---

export async function getProfileComplianceMeta() {
  const response = await client.get('/api/profile/compliance-filings/meta')
  return response.data
}

export async function getProfileComplianceMatrix() {
  const response = await client.get('/api/profile/compliance-filings/matrix')
  return response.data
}

export async function uploadProfileComplianceFiling(formData) {
  const response = await client.post('/api/profile/compliance-filings', formData, multipart)
  return response.data
}

export async function deleteProfileComplianceFiling(id) {
  const response = await client.delete(`/api/profile/compliance-filings/${id}`)
  return response.data
}

// Legacy aliases (admin)
export const getComplianceMeta = getAdminComplianceMeta
export const getComplianceOverview = getAdminComplianceOverview
export const getComplianceMatrix = getAdminComplianceMatrix
export const uploadComplianceFiling = uploadAdminComplianceFiling
export const deleteComplianceFiling = deleteAdminComplianceFiling
