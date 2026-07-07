import { ROLE_LABELS } from '../constants/sectors'
import { formatDate } from './format'

export const DEFAULT_PROGRESS_SHEET_COLUMNS = [
  { key: 'progress_date', label: 'Progress Date' },
  { key: 'title', label: 'Title' },
  { key: 'description', label: 'Description' },
  { key: 'status', label: 'Status' },
  { key: 'added_by_name', label: 'Added By' },
  { key: 'added_by_role', label: 'Added By Role' },
  { key: 'source', label: 'Source' },
  { key: 'comments', label: 'Comments' },
]

const HIDDEN_PROGRESS_COLUMN_KEYS = new Set(['support_file_url'])

export function filterProgressColumns(columns) {
  return (columns || []).filter((col) => !HIDDEN_PROGRESS_COLUMN_KEYS.has(col.key))
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
        description: update.description || '',
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

/** Normalize GET /api/proposals/:id/activities — supports legacy `activities` array. */
export function normalizeProgressListResponse(data) {
  const updates =
    Array.isArray(data?.progress_updates) && data.progress_updates.length
      ? data.progress_updates
      : Array.isArray(data?.activities)
        ? data.activities
        : []

  const columns = filterProgressColumns(
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

  const count = typeof data?.count === 'number' ? data.count : updates.length

  return {
    updates,
    rows,
    columns,
    count,
    approvalRequired: data?.approval_required === true,
  }
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
        const value = row[col.key]
        return value != null && value !== '' ? String(value) : '—'
      }),
    ),
  }
}
