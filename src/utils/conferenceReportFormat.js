import { COOPERATION_MODE_LABELS } from '../constants/proposalFilters'

export function formatReportAmount(value) {
  if (value == null || value === '') return '—'
  const n = Number(value)
  if (Number.isNaN(n)) return String(value)
  return n.toFixed(2)
}

export function formatAgreementType(type) {
  if (!type) return '—'
  return COOPERATION_MODE_LABELS[type] || String(type).replace(/_/g, ' ').toUpperCase()
}

export function formatReportCell(value) {
  if (value == null) return '—'
  const text = String(value).trim()
  return text || '—'
}

/** Selected Opportunities sector filter, if any. */
export function getReportSectorFilter(scope) {
  const raw = scope?.filters?.sector
  if (raw == null) return ''
  const text = String(raw).trim()
  return text && text !== 'all' ? text : ''
}

/**
 * Subtitle sector segment: exact selected sector name, else "All sectors".
 * Never "All sectors (filtered)".
 */
export function buildSectorLabel(scope) {
  return getReportSectorFilter(scope) || 'All sectors'
}

export function buildScopeLabel(scope) {
  if (!scope) return null
  const sectorFilter = getReportSectorFilter(scope)
  if (sectorFilter) return sectorFilter

  if (scope.list_scope === 'all') return 'All sectors'

  const sectors = scope.sectors?.length ? scope.sectors : scope.sector ? [scope.sector] : []
  if (sectors.length) return sectors.join(', ')
  if (scope.list_scope === 'own') return 'Linked MOUs only'
  return 'Sector-scoped report'
}
