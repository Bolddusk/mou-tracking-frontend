import client from './client'

function normalizeComplaintsList(body) {
  if (Array.isArray(body)) {
    return { data: body, filters: {}, total: body.length }
  }
  return {
    data: Array.isArray(body?.data) ? body.data : [],
    filters: body?.filters ?? {},
    total: body?.total ?? (Array.isArray(body?.data) ? body.data.length : 0),
  }
}

export async function uploadComplaintDocument(file) {
  const formData = new FormData()
  formData.append('document', file)
  const response = await client.post('/api/complaints/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data
}

export async function createComplaint(payload) {
  const response = await client.post('/api/complaints', payload)
  return response.data
}

export async function getMyComplaints() {
  const response = await client.get('/api/complaints/my')
  return normalizeComplaintsList(response.data)
}

export async function getSectorComplaints() {
  const response = await client.get('/api/complaints/sector')
  return normalizeComplaintsList(response.data)
}

export async function getForwardedComplaints() {
  const response = await client.get('/api/complaints/forwarded')
  return normalizeComplaintsList(response.data)
}

/** Super Admin — filters: status, sector_lead_id, filed_by, sector, priority, category, overdue, escalated, awaiting_sector_lead, q */
export async function getAllComplaints(params = {}) {
  const cleaned = {}
  for (const [key, value] of Object.entries(params || {})) {
    if (value == null) continue
    const str = String(value).trim()
    if (!str || str === 'all') continue
    cleaned[key] = value
  }
  const response = await client.get('/api/complaints/all', { params: cleaned })
  return normalizeComplaintsList(response.data)
}

export async function getComplaintFilterOptions() {
  const response = await client.get('/api/complaints/filter-options')
  return response.data
}

/** Super Admin dashboard cards */
export async function getComplaintStats() {
  const response = await client.get('/api/complaints/stats')
  return response.data
}

export async function getComplaintById(id) {
  const response = await client.get(`/api/complaints/${id}`)
  return response.data
}

export async function approveComplaint(id, comment) {
  const response = await client.patch(`/api/complaints/${id}/approve`, { comment })
  return response.data
}

export async function rejectComplaint(id, comment) {
  const response = await client.patch(`/api/complaints/${id}/reject`, { comment })
  return response.data
}

export async function escalateComplaint(id, comment) {
  const response = await client.post(`/api/complaints/${id}/escalate`, {
    comment: comment || undefined,
  })
  return response.data
}

export async function reopenComplaint(id, comment) {
  const response = await client.post(`/api/complaints/${id}/reopen`, { comment })
  return response.data
}

export async function forwardComplaint(id, regionalFocalPointId, comment) {
  const response = await client.patch(`/api/complaints/${id}/forward`, {
    regional_focal_point_id: regionalFocalPointId,
    comment,
  })
  return response.data
}

export async function returnComplaintToSectorLead(id, comment) {
  const response = await client.patch(`/api/complaints/${id}/return`, { comment })
  return response.data
}

export async function addComplaintComment(id, { comment, visibility, document_url }) {
  const response = await client.post(`/api/complaints/${id}/comments`, {
    comment,
    visibility,
    document_url,
  })
  return response.data
}

export async function getPartyBAssignedComplaints() {
  const response = await client.get('/api/complaints/party-b-assigned')
  return normalizeComplaintsList(response.data)
}

export async function tagPartyB(id, comment) {
  const response = await client.post(`/api/complaints/${id}/tag-party-b`, { comment })
  return response.data
}

export async function pokePartyB(id, comment) {
  const response = await client.post(`/api/complaints/${id}/poke-party-b`, { comment })
  return response.data
}

export async function getPartyBEngagement(id) {
  const response = await client.get(`/api/complaints/${id}/party-b-engagement`)
  return response.data
}

export async function addPartyBEngagementComment(id, { comment, document_url }) {
  const response = await client.post(`/api/complaints/${id}/party-b-engagement/comments`, {
    comment,
    document_url,
  })
  return response.data
}

export async function respondToPartyBPoke(id, payload) {
  const response = await client.post(`/api/complaints/${id}/party-b-engagement/respond`, payload)
  return response.data
}

export async function uploadPartyBEngagementDocument(id, file) {
  const formData = new FormData()
  formData.append('document', file)
  const response = await client.post(`/api/complaints/${id}/party-b-engagement/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data
}
