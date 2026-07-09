import client from './client'

export async function getProposalActivities(proposalId) {
  const response = await client.get(`/api/proposals/${proposalId}/activities`)
  return response.data
}

function filenameFromContentDisposition(header, fallback) {
  if (!header) return fallback
  const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(header)
  if (utf8Match) return decodeURIComponent(utf8Match[1].trim())
  const quotedMatch = /filename="([^"]+)"/i.exec(header)
  if (quotedMatch) return quotedMatch[1]
  const plainMatch = /filename=([^;]+)/i.exec(header)
  if (plainMatch) return plainMatch[1].trim().replace(/"/g, '')
  return fallback
}

function triggerFileDownload(objectUrl, filename) {
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
}

export async function downloadProgressExport(proposalId, format = 'xlsx') {
  const normalized = format === 'xls' ? 'xlsx' : format
  const today = new Date().toISOString().slice(0, 10)
  const fallback =
    normalized === 'xlsx'
      ? `mou-${proposalId}-progress-${today}.xlsx`
      : `mou-${proposalId}-progress-${today}.csv`

  const response = await client.get(`/api/proposals/${proposalId}/progress/export`, {
    params: { format: normalized },
    responseType: 'blob',
  })

  const filename = filenameFromContentDisposition(
    response.headers?.['content-disposition'],
    fallback,
  )
  const objectUrl = URL.createObjectURL(response.data)
  triggerFileDownload(objectUrl, filename)
  setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000)
}

export async function fetchProgressExportPreviewText(proposalId) {
  const response = await client.get(`/api/proposals/${proposalId}/progress/export`, {
    params: { format: 'csv' },
    responseType: 'blob',
  })
  return response.data.text()
}

export async function updateActivity(activityId, data) {
  const response = await client.patch(`/api/activities/${activityId}`, data)
  return response.data
}

export async function deleteActivity(activityId) {
  const response = await client.delete(`/api/activities/${activityId}`)
  return response.data
}

export async function requestEditUnlock(activityId, note) {
  const response = await client.post(`/api/activities/${activityId}/request-edit-unlock`, {
    note: note || undefined,
  })
  return response.data
}

export async function grantEditUnlock(activityId) {
  const response = await client.patch(`/api/activities/${activityId}/grant-edit-unlock`)
  return response.data
}

export async function createActivity(proposalId, data) {
  const response = await client.post(`/api/proposals/${proposalId}/activities`, data)
  return response.data
}

export async function uploadActivitySupport(file) {
  const formData = new FormData()
  formData.append('support_file', file)
  const response = await client.post('/api/activities/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data
}

export async function pokeForUpdate(proposalId) {
  const response = await client.post(`/api/proposals/${proposalId}/poke`)
  return response.data
}

export async function respondToPoke(activityId, data) {
  const response = await client.post(`/api/activities/${activityId}/respond`, data)
  return response.data
}

export async function patchPokeResponse(activityId, data) {
  const response = await client.patch(`/api/activities/${activityId}/poke-response`, data)
  return response.data
}

export async function promoteUpdateToProgress(activityId, comment) {
  const response = await client.post(`/api/activities/${activityId}/promote-to-progress`, {
    comment: comment?.trim() || undefined,
  })
  return response.data
}

export async function dismissUpdateRequest(activityId) {
  const response = await client.post(`/api/activities/${activityId}/dismiss-update-request`)
  return response.data
}

export async function dismissAllPendingUpdateRequests() {
  const response = await client.post('/api/admin/update-requests/dismiss-all-pending')
  return response.data
}

export async function approveActivity(activityId, comment) {
  const response = await client.patch(`/api/activities/${activityId}/approve`, {
    comment: comment || undefined,
  })
  return response.data
}

export async function rejectActivity(activityId, comment) {
  const response = await client.patch(`/api/activities/${activityId}/reject`, { comment })
  return response.data
}

export async function addActivityComment(activityId, comment) {
  const response = await client.post(`/api/activities/${activityId}/comments`, { comment })
  return response.data
}

export async function getActivityComments(activityId) {
  const response = await client.get(`/api/activities/${activityId}/comments`)
  return response.data
}
