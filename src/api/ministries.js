import client from './client'

function normalizeList(body) {
  if (Array.isArray(body)) {
    return { data: body, total: body.length }
  }
  return {
    data: Array.isArray(body?.data) ? body.data : [],
    total: body?.total ?? (Array.isArray(body?.data) ? body.data.length : 0),
  }
}

/** Active ministries (or all including inactive when `all=1` for Super Admin). */
export async function listMinistries({ all = false } = {}) {
  const params = all ? { all: 1 } : {}
  const response = await client.get('/api/ministries', { params })
  return normalizeList(response.data)
}

export async function createMinistry(payload) {
  const response = await client.post('/api/ministries', payload)
  return response.data
}

export async function updateMinistry(id, payload) {
  const response = await client.patch(`/api/ministries/${id}`, payload)
  return response.data
}

export async function deleteMinistry(id) {
  const response = await client.delete(`/api/ministries/${id}`)
  return response.data
}
