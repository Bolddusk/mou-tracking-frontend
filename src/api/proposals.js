import client from './client'

export async function saveDraft(data) {
  const response = await client.post('/api/proposals/draft', data)
  return response.data
}

export async function submitProposal(proposalId) {
  const response = await client.post('/api/proposals/submit', {
    proposal_id: proposalId,
  })
  return response.data
}

export async function resubmitProposal(proposalId) {
  const response = await client.patch(`/api/proposals/${proposalId}/resubmit`)
  return response.data
}

export async function uploadFile(file, fieldName) {
  const formData = new FormData()
  formData.append(fieldName, file)
  const response = await client.post('/api/proposals/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data
}

export async function getMyProposals() {
  const response = await client.get('/api/proposals/my')
  return response.data
}

export async function deleteProposal(id) {
  const response = await client.delete(`/api/proposals/${id}`)
  return response.data
}

export async function getSectorLeadProposals(status) {
  const params = status ? { status } : {}
  const response = await client.get('/api/proposals/sector-lead', { params })
  return response.data
}

/** @param {string|Record<string, string|boolean|undefined>} [params] */
export async function getAllProposals(params) {
  const resolved =
    typeof params === 'string' ? (params ? { status: params } : {}) : params || {}
  const response = await client.get('/api/proposals/all', { params: resolved })
  return response.data
}

export async function getProposalFilterOptions() {
  const response = await client.get('/api/proposals/filter-options')
  return response.data
}

export async function getProposalById(id) {
  const response = await client.get(`/api/proposals/${id}`)
  return response.data
}

export async function getProposalMou(proposalId) {
  const response = await client.get(`/api/proposals/${proposalId}/mou`)
  return response.data
}

export async function getProposalMouAckStatus(proposalId) {
  const response = await client.get(`/api/proposals/${proposalId}/mou/status`)
  return response.data
}

export async function acknowledgeProposalMou(proposalId) {
  const response = await client.patch(`/api/proposals/${proposalId}/mou/acknowledge`)
  return response.data
}

export async function closeProposalDeal(proposalId) {
  const response = await client.patch(`/api/proposals/${proposalId}/close-deal`)
  return response.data
}

export async function getProposalMouVersions(proposalId) {
  const response = await client.get(`/api/proposals/${proposalId}/mou/versions`)
  return response.data
}

export async function saveProposalMou(proposalId, fields, file) {
  const formData = new FormData()
  const textFields = [
    'mou_scope',
    'mou_description',
    'mou_sector',
    'mou_demand',
    'mou_status',
  ]
  for (const key of textFields) {
    const val = fields[key]
    if (val != null && String(val).trim() !== '') {
      formData.append(key, String(val).trim())
    }
  }
  if (file) formData.append('mou_file', file)

  const response = await client.patch(`/api/proposals/${proposalId}/mou`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data
}

export async function getProposalMessages(proposalId, { limit = 50, before } = {}) {
  const params = { limit }
  if (before != null) params.before = before
  const response = await client.get(`/api/proposals/${proposalId}/messages`, { params })
  return response.data
}

export async function approveProposal(id, comment) {
  const response = await client.patch(`/api/proposals/${id}/approve`, {
    comment: comment || undefined,
  })
  return response.data
}

export async function rejectProposal(id, comment) {
  const response = await client.patch(`/api/proposals/${id}/reject`, { comment })
  return response.data
}

export async function getProposalExportReport(proposalId) {
  const response = await client.get(`/api/proposals/${proposalId}/export-report`)
  return response.data
}

const EXPORT_MIME = {
  pdf: 'application/pdf',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: 'text/csv',
}

const EXPORT_EXT = {
  pdf: 'pdf',
  xlsx: 'xlsx',
  xls: 'xlsx',
  csv: 'csv',
}

export async function downloadProposalExport(proposalId, format = 'pdf') {
  const normalized = format === 'xls' ? 'xlsx' : format
  const response = await client.get(`/api/proposals/${proposalId}/export-report`, {
    params: { format: normalized },
    responseType: 'blob',
  })

  const mime = EXPORT_MIME[normalized] || response.headers['content-type'] || 'application/octet-stream'
  const blob = new Blob([response.data], { type: mime })
  const objectUrl = URL.createObjectURL(blob)
  const ext = EXPORT_EXT[normalized] || normalized

  if (normalized === 'pdf') {
    const tab = window.open(objectUrl, '_blank', 'noopener,noreferrer')
    if (!tab) {
      const anchor = document.createElement('a')
      anchor.href = objectUrl
      anchor.download = `proposal-${proposalId}-report.${ext}`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
    }
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000)
    return
  }

  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = `proposal-${proposalId}-report.${ext}`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(objectUrl)
}

/** @deprecated Use downloadProposalExport(proposalId, 'csv') */
export async function downloadProposalExportCsv(proposalId) {
  return downloadProposalExport(proposalId, 'csv')
}
