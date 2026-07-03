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

export function buildScopeLabel(scope) {
  if (!scope) return null
  if (scope.list_scope === 'all') return 'All sectors'
  const sectors = scope.sectors?.length ? scope.sectors : scope.sector ? [scope.sector] : []
  if (sectors.length) return `Sector scope: ${sectors.join(', ')}`
  return 'Sector-scoped report'
}
