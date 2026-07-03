import client from './client'

export async function getSifcCategories() {
  const response = await client.get('/api/sifc-categories')
  return response.data
}

export async function getAdminSifcCategories() {
  const response = await client.get('/api/admin/sifc-categories')
  return response.data
}

export async function getAdminSifcCategory(id) {
  const response = await client.get(`/api/admin/sifc-categories/${id}`)
  return response.data
}

export async function createSifcCategory(body) {
  const response = await client.post('/api/admin/sifc-categories', body)
  return response.data
}

export async function updateSifcCategory(id, body) {
  const response = await client.patch(`/api/admin/sifc-categories/${id}`, body)
  return response.data
}

export async function deleteSifcCategory(id) {
  const response = await client.delete(`/api/admin/sifc-categories/${id}`)
  return response.data
}
