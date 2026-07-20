import client from './client'
import { buildChangeLogListParams } from '../utils/changeLogFilters'
import { buildConferenceReportParams } from '../utils/conferenceReportQuery'
import { getProposalsListApi, PROPOSALS_LIST_API } from '../utils/rbac'

function normalizePaginatedListResponse(body, params = {}) {
  if (Array.isArray(body)) {
    return {
      data: body,
      pagination: {
        page: 1,
        limit: body.length,
        total: body.length,
        total_pages: 1,
        has_next: false,
        has_prev: false,
      },
      filters: {},
    }
  }

  return {
    data: Array.isArray(body?.data) ? body.data : [],
    pagination: body?.pagination ?? null,
    filters: body?.filters ?? {},
  }
}

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

export async function getMyProposalsPaginated(params = {}) {
  const resolved =
    typeof params === 'string' ? (params ? { status: params } : {}) : params || {}
  const response = await client.get('/api/proposals/my', { params: resolved })
  return normalizePaginatedListResponse(response.data, resolved)
}

export async function getMyProposals() {
  const { data } = await getMyProposalsPaginated()
  return data
}

export async function getProposalsListPaginatedByPath(apiPath, params = {}) {
  const resolved =
    typeof params === 'string' ? (params ? { status: params } : {}) : params || {}
  const response = await client.get(apiPath, { params: resolved })
  return normalizePaginatedListResponse(response.data, resolved)
}

/**
 * Opportunities list — uses rbac.capabilities.proposals_list_api from GET /api/auth/me.
 * Never hardcode /api/proposals/all; missing rbac defaults to scoped /my (safe).
 */
export async function getOpportunitiesListPaginated(params, rbac) {
  const apiPath = rbac ? getProposalsListApi(rbac) : PROPOSALS_LIST_API.OWN
  return getProposalsListPaginatedByPath(apiPath, params)
}

export async function deleteProposal(id) {
  const response = await client.delete(`/api/proposals/${id}`)
  return response.data
}

export async function archiveProposal(id, reason) {
  const body = reason?.trim() ? { reason: reason.trim() } : {}
  const response = await client.patch(`/api/proposals/${id}/archive`, body)
  return response.data
}

export async function restoreProposal(id) {
  const response = await client.patch(`/api/proposals/${id}/restore`)
  return response.data
}

export async function getSectorLeadProposals(status) {
  const { data } = await getSectorLeadProposalsPaginated(status ? { status } : {})
  return data
}

/**
 * Paginated list for Sector Lead — GET /api/proposals/sector-lead
 * Same query params as GET /api/proposals/all (scoped to SL sector).
 * @returns {{ data: object[], pagination: object|null, filters: object }}
 */
export async function getSectorLeadProposalsPaginated(params) {
  const resolved =
    typeof params === 'string' ? (params ? { status: params } : {}) : params || {}
  const response = await client.get('/api/proposals/sector-lead', { params: resolved })
  const body = response.data

  if (Array.isArray(body)) {
    return {
      data: body,
      pagination: {
        page: 1,
        limit: body.length,
        total: body.length,
        total_pages: 1,
        has_next: false,
        has_prev: false,
      },
      filters: {},
    }
  }

  return {
    data: Array.isArray(body?.data) ? body.data : [],
    pagination: body?.pagination ?? null,
    filters: body?.filters ?? {},
  }
}

/** @param {string|Record<string, string|number|boolean|undefined>} [params] */
export async function getAllProposals(params) {
  const { data } = await getAllProposalsPaginated(params)
  return data
}

/**
 * Paginated list for Super Admin — GET /api/proposals/all
 * @returns {{ data: object[], pagination: object|null, filters: object }}
 */
export async function getAllProposalsPaginated(params) {
  const resolved =
    typeof params === 'string' ? (params ? { status: params } : {}) : params || {}
  const response = await client.get('/api/proposals/all', { params: resolved })
  const body = response.data

  if (Array.isArray(body)) {
    return {
      data: body,
      pagination: {
        page: 1,
        limit: body.length,
        total: body.length,
        total_pages: 1,
        has_next: false,
        has_prev: false,
      },
      filters: {},
    }
  }

  return {
    data: Array.isArray(body?.data) ? body.data : [],
    pagination: body?.pagination ?? null,
    filters: body?.filters ?? {},
  }
}

export async function getProposalFilterOptions() {
  const response = await client.get('/api/proposals/filter-options')
  return response.data
}

export async function getConferenceReport(conferenceKey, filters = {}) {
  const params = buildConferenceReportParams({
    conference_key: conferenceKey,
    ...filters,
  })
  const response = await client.get('/api/proposals/conference-report', { params })
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

/**
 * @param {'pdf'|'xlsx'} format
 * @param {{ attachment?: boolean, filters?: Record<string, unknown> }} [options]
 *   PDF default inline tab; xlsx always downloads. `filters` = Opportunities query (minus page/limit).
 */
export async function downloadConferenceReport(
  conferenceKey,
  format,
  { attachment = false, filters = {} } = {},
) {
  const params = buildConferenceReportParams({
    conference_key: conferenceKey,
    format,
    ...filters,
    ...(attachment ? { download: 1 } : {}),
  })

  const response = await client.get('/api/proposals/conference-report', {
    params,
    responseType: 'blob',
  })

  const safeKey = String(conferenceKey).replace(/[^a-z0-9-]+/gi, '-')
  const defaultName =
    format === 'xlsx' ? `SIFC-report-${safeKey}.xlsx` : `SIFC-report-${safeKey}.pdf`
  const defaultMime =
    format === 'xlsx'
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : 'application/pdf'

  const filename = filenameFromContentDisposition(
    response.headers['content-disposition'],
    defaultName,
  )
  const blob = new Blob([response.data], {
    type: response.headers['content-type'] || defaultMime,
  })
  const objectUrl = URL.createObjectURL(blob)

  if (format === 'pdf' && !attachment) {
    const tab = window.open(objectUrl, '_blank', 'noopener,noreferrer')
    if (!tab) triggerFileDownload(objectUrl, filename)
  } else {
    triggerFileDownload(objectUrl, filename)
  }

  setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000)
}

export async function downloadConferenceReportPdf(conferenceKey, filters = {}) {
  return downloadConferenceReport(conferenceKey, 'pdf', { filters })
}

export async function downloadConferenceReportXlsx(conferenceKey, filters = {}) {
  return downloadConferenceReport(conferenceKey, 'xlsx', { attachment: true, filters })
}

export async function getProposalSifcReport(proposalId) {
  const response = await client.get(`/api/proposals/${proposalId}/sifc-report`, {
    params: { format: 'json' },
  })
  return response.data
}

/**
 * @param {number|string} proposalId
 * @param {'pdf'|'xlsx'} format
 * @param {{ attachment?: boolean }} [options]
 */
export async function downloadProposalSifcReport(proposalId, format, { attachment = false } = {}) {
  const params = { format }
  if (attachment) params.download = 1

  const response = await client.get(`/api/proposals/${proposalId}/sifc-report`, {
    params,
    responseType: 'blob',
  })

  const defaultName =
    format === 'xlsx'
      ? `mou-${proposalId}-sifc-report.xlsx`
      : `mou-${proposalId}-sifc-report.pdf`
  const defaultMime =
    format === 'xlsx'
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : 'application/pdf'

  const filename = filenameFromContentDisposition(
    response.headers['content-disposition'],
    defaultName,
  )
  const blob = new Blob([response.data], {
    type: response.headers['content-type'] || defaultMime,
  })
  const objectUrl = URL.createObjectURL(blob)

  if (format === 'pdf' && !attachment) {
    const tab = window.open(objectUrl, '_blank', 'noopener,noreferrer')
    if (!tab) triggerFileDownload(objectUrl, filename)
  } else {
    triggerFileDownload(objectUrl, filename)
  }

  setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000)
}

export async function downloadProposalSifcReportPdf(proposalId) {
  return downloadProposalSifcReport(proposalId, 'pdf', { attachment: true })
}

export async function downloadProposalSifcReportXlsx(proposalId) {
  return downloadProposalSifcReport(proposalId, 'xlsx', { attachment: true })
}

export async function getProposalById(id) {
  const response = await client.get(`/api/proposals/${id}`)
  return response.data
}

export async function getProposalChangeLogs(proposalId, { limit = 50, offset = 0 } = {}) {
  const response = await client.get(`/api/proposals/${proposalId}/change-logs`, {
    params: { limit, offset },
  })
  return response.data
}

export async function getChangeLogsFilterOptions() {
  const response = await client.get('/api/proposals/change-logs/filter-options')
  return response.data
}

/** Admin / Super Admin — latest changes across all MOUs (newest first). */
export async function getRecentChangeLogs(filters = {}) {
  const { limit = 50, offset = 0, ...rest } = filters
  const response = await client.get('/api/proposals/change-logs/recent', {
    params: buildChangeLogListParams(rest, { limit, offset }),
  })
  return response.data
}

/** Sector Lead — changes within assigned jurisdiction. */
export async function getSectorChangeLogs(filters = {}) {
  const { limit = 50, offset = 0, ...rest } = filters
  const response = await client.get('/api/proposals/change-logs/sector', {
    params: buildChangeLogListParams(rest, { limit, offset }),
  })
  return response.data
}

/** @deprecated Use getRecentChangeLogs — MOU picker no longer needed in UI. */
export async function getChangeLogsMouOptions({ limit = 100, q, offset = 0 } = {}) {
  const params = { limit, offset }
  const trimmed = q?.trim()
  if (trimmed) params.q = trimmed
  const response = await client.get('/api/proposals/change-logs/mou-options', { params })
  return response.data
}

/** Party A / others — timeline of their own MOU edits. */
export async function getMyChangeLogs({ limit = 50, offset = 0 } = {}) {
  const response = await client.get('/api/proposals/change-logs/mine', {
    params: { limit, offset },
  })
  return response.data
}

/**
 * Fetch change logs export blob — same filter params as list APIs.
 * @param {'csv'|'xlsx'} format
 */
export async function fetchChangeLogsExport(filters = {}, format = 'csv') {
  const normalized = format === 'xls' ? 'xlsx' : format
  const params = { ...buildChangeLogListParams(filters), format: normalized }

  const response = await client.get('/api/proposals/change-logs/export', {
    params,
    responseType: 'blob',
  })

  const today = new Date().toISOString().slice(0, 10)
  const defaultName =
    normalized === 'xlsx'
      ? `mou-change-logs-filtered-${today}.xlsx`
      : `mou-change-logs-general-${today}.csv`
  const defaultMime =
    normalized === 'xlsx'
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : 'text/csv'

  const filename = filenameFromContentDisposition(
    response.headers['content-disposition'],
    defaultName,
  )
  const blob = new Blob([response.data], {
    type: response.headers['content-type'] || defaultMime,
  })

  return { blob, filename, mime: blob.type, format: normalized }
}

/**
 * Export change logs — same filter params as list APIs (no limit/offset).
 * @param {'csv'|'xlsx'} format
 */
export async function downloadChangeLogsExport(filters = {}, format = 'csv') {
  const { blob, filename } = await fetchChangeLogsExport(filters, format)
  const objectUrl = URL.createObjectURL(blob)
  triggerFileDownload(objectUrl, filename)
  setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000)
}

/** Preview uses CSV so the report can render in-browser. */
export async function fetchChangeLogsExportPreviewText(filters = {}) {
  const { blob } = await fetchChangeLogsExport(filters, 'csv')
  return blob.text()
}

function parseChangeLogExportResponse(response, { defaultName, defaultMime, format }) {
  const filename = filenameFromContentDisposition(
    response.headers['content-disposition'],
    defaultName,
  )
  const blob = new Blob([response.data], {
    type: response.headers['content-type'] || defaultMime,
  })
  return { blob, filename, mime: blob.type, format }
}

/**
 * Export change logs for a single MOU (History tab).
 * Primary: GET /api/proposals/:id/change-logs/export
 */
export async function fetchProposalChangeLogsExport(
  proposalId,
  format = 'xlsx',
  { proposalLabel } = {},
) {
  const normalized = format === 'xls' ? 'xlsx' : format
  const today = new Date().toISOString().slice(0, 10)
  const defaultName =
    normalized === 'xlsx'
      ? `mou-${proposalId}-change-logs-${today}.xlsx`
      : `mou-${proposalId}-change-logs-${today}.csv`
  const defaultMime =
    normalized === 'xlsx'
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : 'text/csv'

  const response = await client.get(`/api/proposals/${proposalId}/change-logs/export`, {
    params: { format: normalized },
    responseType: 'blob',
  })
  return parseChangeLogExportResponse(response, { defaultName, defaultMime, format: normalized })
}

export async function downloadProposalChangeLogsExport(
  proposalId,
  format = 'xlsx',
  options = {},
) {
  const { blob, filename } = await fetchProposalChangeLogsExport(proposalId, format, options)
  const objectUrl = URL.createObjectURL(blob)
  triggerFileDownload(objectUrl, filename)
  setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000)
}

export async function fetchProposalChangeLogsExportPreviewText(proposalId, options = {}) {
  const { blob } = await fetchProposalChangeLogsExport(proposalId, 'csv', options)
  return blob.text()
}

export async function getProposalEditableFields(id) {
  const response = await client.get(`/api/proposals/${id}/editable-fields`)
  return response.data
}

export async function patchProposalFields(id, body) {
  const response = await client.patch(`/api/proposals/${id}/fields`, body)
  return response.data
}

export async function patchProposalPartyContacts(proposalId, body) {
  const response = await client.patch(`/api/proposals/${proposalId}/party-contacts`, body)
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

/** Delete current MOU file (keeps text fields). DELETE /api/proposals/:id/mou */
export async function deleteProposalMou(proposalId) {
  const response = await client.delete(`/api/proposals/${proposalId}/mou`)
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
