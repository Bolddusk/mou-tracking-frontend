import { ROLE_LABELS } from '../constants/sectors'
import { formatDate } from './format'

function escapeCsvCell(value) {
  const text = value == null || value === '' ? '' : String(value)
  if (/[",\r\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

function normalizeLogChanges(log) {
  const raw = log?.changes
  if (Array.isArray(raw)) return raw.filter(Boolean)
  if (raw && typeof raw === 'object') return Object.values(raw).filter(Boolean)
  return []
}

function formatBeforeAfter(log) {
  const changes = normalizeLogChanges(log)
  if (changes.length > 0) {
    return changes
      .map((change) => {
        const label = change.label || change.field || 'Field'
        const before = change.old_value == null || change.old_value === '' ? '—' : change.old_value
        const after = change.new_value == null || change.new_value === '' ? '—' : change.new_value
        return `${label}: ${before} → ${after}`
      })
      .join('; ')
  }
  if (Array.isArray(log.change_details) && log.change_details.length > 0) {
    return log.change_details.join('; ')
  }
  return ''
}

function formatFieldsChanged(log) {
  if (Array.isArray(log.fields_changed) && log.fields_changed.length > 0) {
    return log.fields_changed.join(', ')
  }
  return normalizeLogChanges(log)
    .map((change) => change.label || change.field)
    .filter(Boolean)
    .join(', ')
}

export function buildProposalChangeLogsCsvText(logs, { proposalId, proposalLabel } = {}) {
  const today = new Date().toISOString().slice(0, 10)
  const headers = [
    'Log ID',
    'Date/Time',
    'MOU ID',
    'MOU',
    'Sector',
    'MOU Status',
    'Changed By',
    'Role',
    'Action',
    'Summary',
    'Fields Changed',
    'Before → After',
  ]

  const summaryLines = [
    `MOU Change Logs Report — MOU #${proposalId ?? '—'}`,
    proposalLabel ? `MOU: ${proposalLabel}` : null,
    `Generated: ${today}`,
    `Total entries: ${logs.length}`,
  ].filter(Boolean)

  const rows = logs.map((log) => [
    log.id ?? '',
    formatDate(log.created_at) || log.created_at || '',
    log.proposal_id ?? proposalId ?? '',
    log.proposal_label || proposalLabel || '',
    log.sector || '',
    log.mou_status || log.proposal_status || '',
    log.changed_by_name || '',
    ROLE_LABELS[log.changed_by_role] || log.changed_by_role || '',
    log.action_label || log.action || '',
    log.summary || '',
    formatFieldsChanged(log),
    formatBeforeAfter(log),
  ])

  const lines = [
    ...summaryLines,
    '',
    headers.map(escapeCsvCell).join(','),
    ...rows.map((row) => row.map(escapeCsvCell).join(',')),
  ]

  return lines.join('\r\n')
}

function parseCsvLine(line) {
  const cells = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      cells.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  cells.push(current)
  return cells.map((c) => c.trim())
}

export function parseChangeLogsCsv(text) {
  if (!text?.trim()) return { summaryLines: [], headers: [], rows: [] }

  const lines = text.split(/\r?\n/).filter((line) => line.trim())
  const parsed = lines.map(parseCsvLine)

  const headerIndex = parsed.findIndex(
    (row) => row[0]?.toLowerCase() === 'log id' || row.includes('Log ID'),
  )

  if (headerIndex === -1) {
    return { summaryLines: lines, headers: [], rows: [] }
  }

  const headers = parsed[headerIndex]
  const rows = parsed.slice(headerIndex + 1).filter((row) => row.some((cell) => cell))

  const summaryLines = lines.slice(0, headerIndex)

  return { summaryLines, headers, rows }
}
