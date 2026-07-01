import client from './client'

export async function getSectors() {
  const response = await client.get('/api/sectors')
  return response.data
}

export async function getAdminSectors() {
  const response = await client.get('/api/admin/sectors')
  return response.data
}

export async function getAdminSector(id) {
  const response = await client.get(`/api/admin/sectors/${id}`)
  return response.data
}

export async function createSector(body) {
  const response = await client.post('/api/admin/sectors', body)
  return response.data
}

export async function updateSector(id, body) {
  const response = await client.patch(`/api/admin/sectors/${id}`, body)
  return response.data
}

export async function deleteSector(id) {
  const response = await client.delete(`/api/admin/sectors/${id}`)
  return response.data
}
