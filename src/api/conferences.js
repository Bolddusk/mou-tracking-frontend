import client from './client'

export async function getConferences(params = {}) {
  const cleaned = {}
  for (const [key, value] of Object.entries(params || {})) {
    if (value == null || value === '') continue
    cleaned[key] = value
  }
  const response = await client.get('/api/conferences', {
    params: Object.keys(cleaned).length ? cleaned : undefined,
  })
  return response.data
}

export async function getAdminConferences() {
  const response = await client.get('/api/admin/conferences')
  return response.data
}

export async function getAdminConference(id) {
  const response = await client.get(`/api/admin/conferences/${id}`)
  return response.data
}

export async function createConference(body) {
  const response = await client.post('/api/admin/conferences', body)
  return response.data
}

export async function updateConference(id, body) {
  const response = await client.patch(`/api/admin/conferences/${id}`, body)
  return response.data
}

export async function deleteConference(id) {
  const response = await client.delete(`/api/admin/conferences/${id}`)
  return response.data
}
