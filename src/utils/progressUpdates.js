import { ROLE_LABELS } from '../constants/sectors'
import { formatDate } from './format'

export const DEFAULT_PROGRESS_SHEET_COLUMNS = [
  { key: 'progress_date', label: 'Progress Date' },
  { key: 'title', label: 'Title' },
  { key: 'description', label: 'Description' },
  { key: 'recorded_at', label: 'Recorded At' },
  { key: 'status', label: 'Status' },
  { key: 'added_by_name', label: 'Added By' },
  { key: 'comments', label: 'Comments' },
]

const HIDDEN_PROGRESS_COLUMN_KEYS = new Set([
  'support_file_url',
  'source',
  'added_by_role',
])

export function filterProgressColumns(columns) {
  return (columns || []).filter((col) => !HIDDEN_PROGRESS_COLUMN_KEYS.has(col.key))
}

function ensureRecordedAtColumn(columns) {
  const filtered = filterProgressColumns(columns)
  if (filtered.some((col) => col.key === 'recorded_at')) return filtered
  const recordedCol = { key: 'recorded_at', label: 'Recorded At' }
  const descIdx = filtered.findIndex((col) => col.key === 'description')
  if (descIdx >= 0) {
    return [
      ...filtered.slice(0, descIdx + 1),
      recordedCol,
      ...filtered.slice(descIdx + 1),
    ]
  }
  return [...filtered, recordedCol]
}

export const PROGRESS_SOURCE_LABELS = {
  mou_field_sync: 'MOU fields',
  manual: 'Manual entry',
}

function plainCommentsText(update) {
  if (update?.comments_display != null && String(update.comments_display).trim()) {
    return String(update.comments_display).trim()
  }
  if (update?.sheet_row?.comments != null && String(update.sheet_row.comments).trim()) {
    return String(update.sheet_row.comments).trim()
  }
  if (typeof update?.comments === 'string' && update.comments.trim()) {
    return update.comments.trim()
  }
  return ''
}

function buildSheetRowFromUpdate(update) {
  const base = update?.sheet_row
    ? { id: update.id, ...update.sheet_row }
    : {
        id: update.id,
        progress_date: update.progress_date || update.activity_date || '',
        title: update.title || '',
        description: update.description || update.what_was_done || '',
        recorded_at: update.recorded_at || '',
        status: update.status_label || update.status || 'Recorded',
        added_by_name: update.added_by_name || '',
        added_by_role: ROLE_LABELS[update.added_by_role] || update.added_by_role || '',
        source:
          update.source_label || PROGRESS_SOURCE_LABELS[update.source] || update.source || '',
        comments: plainCommentsText(update),
      }

  if (!base.comments) {
    base.comments = plainCommentsText(update)
  }

  return {
    ...base,
    can_edit: update.can_edit,
    can_delete: update.can_delete,
    edit_locked: update.edit_locked,
    unlock_requested: update.unlock_requested,
    can_request_unlock: update.can_request_unlock,
    can_grant_unlock: update.can_grant_unlock,
  }
}

function progressRowSortValue(row, update) {
  const recorded = row.recorded_at || update?.recorded_at
  if (recorded) {
    const t = new Date(recorded).getTime()
    if (!Number.isNaN(t)) return t
  }
  const progressDate = row.progress_date || update?.activity_date || update?.progress_date
  if (progressDate) {
    const t = new Date(progressDate).getTime()
    if (!Number.isNaN(t)) return t
  }
  const id = row.id ?? update?.id
  return typeof id === 'number' ? id : 0
}

function sortProgressRowsNewestFirst(rows, updates) {
  const updateById = new Map(updates.map((u) => [u.id, u]))
  return [...rows].sort((a, b) => {
    const aUpdate = updateById.get(a.id)
    const bUpdate = updateById.get(b.id)
    return progressRowSortValue(b, bUpdate) - progressRowSortValue(a, bUpdate)
  })
}

/** Normalize GET /api/proposals/:id/activities — supports legacy `activities` array. */
export function normalizeProgressListResponse(data) {
  const updates =
    Array.isArray(data?.progress_updates) && data.progress_updates.length
      ? data.progress_updates
      : Array.isArray(data?.activities)
        ? data.activities
        : []

  const columns = ensureRecordedAtColumn(
    Array.isArray(data?.sheet_columns) && data.sheet_columns.length
      ? data.sheet_columns
      : DEFAULT_PROGRESS_SHEET_COLUMNS,
  )

  let rows = Array.isArray(data?.progress_rows) ? data.progress_rows : []
  if (rows.length && updates.length) {
    const flagsById = new Map(updates.map((u) => [u.id, u]))
    rows = rows.map((row) => {
      const update = flagsById.get(row.id)
      if (!update) return row
      return {
        ...row,
        description: row.description || update.description || update.what_was_done || '',
        recorded_at: row.recorded_at ?? update.recorded_at ?? '',
        comments: row.comments || plainCommentsText(update),
        can_edit: row.can_edit ?? update.can_edit,
        can_delete: row.can_delete ?? update.can_delete,
        edit_locked: row.edit_locked ?? update.edit_locked,
        unlock_requested: row.unlock_requested ?? update.unlock_requested,
        can_request_unlock: row.can_request_unlock ?? update.can_request_unlock,
        can_grant_unlock: row.can_grant_unlock ?? update.can_grant_unlock,
      }
    })
  }
  if (!rows.length && updates.length) {
    rows = updates.map(buildSheetRowFromUpdate)
  }

  rows = sortProgressRowsNewestFirst(rows, updates)
  const sortedUpdates = [...updates].sort(
    (a, b) =>
      progressRowSortValue(
        {
          id: b.id,
          recorded_at: b.recorded_at,
          progress_date: b.progress_date || b.activity_date,
        },
        b,
      ) -
      progressRowSortValue(
        {
          id: a.id,
          recorded_at: a.recorded_at,
          progress_date: a.progress_date || a.activity_date,
        },
        a,
      ),
  )

  const count = typeof data?.count === 'number' ? data.count : updates.length

  return {
    updates: sortedUpdates,
    rows,
    columns,
    count,
    approvalRequired: data?.approval_required === true,
    canAddProgress:
      data?.can_add_progress === true
        ? true
        : data?.can_add_progress === false
          ? false
          : null,
  }
}

/**
 * Prefer activities `can_add_progress`, then proposal `capabilities.can_add_activity`.
 * Explicit false denies; both unset keeps legacy allow (incl. power_admin as SA).
 */
export function resolveCanAddProgress(listFlag, capabilityFlag) {
  if (listFlag === true) return true
  if (listFlag === false) return false
  if (capabilityFlag === true) return true
  if (capabilityFlag === false) return false
  return true
}

export function formatProgressSource(value) {
  if (!value) return '—'
  return PROGRESS_SOURCE_LABELS[value] || value
}

/** Full comment thread for report preview / export — one line per comment with author + date. */
export function formatProgressCommentsForReport(update, row) {
  const detail = update?.comments_detail || []
  if (detail.length) {
    return detail
      .map((c) => {
        const who = c.commented_by_name || 'Unknown'
        const role = ROLE_LABELS[c.commented_by_role] || c.commented_by_role || ''
        const when = c.created_at ? formatDate(c.created_at) : ''
        return `${who}${role ? ` · ${role}` : ''}${when ? ` · ${when}` : ''}: ${c.comment}`
      })
      .join('\n')
  }
  return plainCommentsText(update) || row?.comments || ''
}

/** Build table rows for Progress report preview from live activities data. */
export function buildProgressReportTableData(rows, columns, updates = []) {
  const updatesById = new Map(updates.map((u) => [u.id, u]))

  return {
    headers: columns.map((col) => col.label),
    rows: rows.map((row) =>
      columns.map((col) => {
        const update = updatesById.get(row.id)
        if (col.key === 'comments') {
          const text = formatProgressCommentsForReport(update, row)
          return text || '—'
        }
        if (col.key === 'source') {
          const value = row[col.key] || update?.source
          return formatProgressSource(value) || value || '—'
        }
        if (col.key === 'added_by_role') {
          return ROLE_LABELS[row[col.key]] || row[col.key] || '—'
        }
        if (col.key === 'progress_date') {
          return formatDate(row[col.key]) || row[col.key] || '—'
        }
        if (col.key === 'recorded_at') {
          const value = row[col.key] || update?.recorded_at
          if (!value) return '—'
          const d = new Date(value)
          if (Number.isNaN(d.getTime())) return String(value)
          return d.toLocaleString('en-PK', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          })
        }
        const value = row[col.key]
        return value != null && value !== '' ? String(value) : '—'
      }),
    ),
  }
}
