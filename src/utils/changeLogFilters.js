export const EMPTY_ADMIN_CHANGE_LOG_FILTERS = {
  q: '',
  sector_lead_id: '',
  sector: '',
  changed_by_role: '',
  mou_status: '',
  from: '',
  to: '',
}

export const EMPTY_SECTOR_CHANGE_LOG_FILTERS = {
  q: '',
  sector: '',
  changed_by_role: '',
  mou_status: '',
  from: '',
  to: '',
  mine_only: false,
}

export function buildChangeLogListParams(filters = {}, pagination = {}) {
  const params = {}
  if (pagination.limit != null) params.limit = pagination.limit
  if (pagination.offset != null) params.offset = pagination.offset

  const trimmedQ = filters.q?.trim?.() ?? filters.q
  if (trimmedQ) {
    params.q = trimmedQ
    if (/^\d+$/.test(trimmedQ)) {
      params.proposal_id = Number(trimmedQ)
    }
  }

  if (filters.proposal_id != null && filters.proposal_id !== '') {
    params.proposal_id = Number(filters.proposal_id)
  }

  for (const key of ['sector', 'mou_status', 'changed_by_role', 'from', 'to']) {
    const val = filters[key]
    if (val != null && String(val).trim() !== '') params[key] = String(val).trim()
  }

  if (filters.sector_lead_id != null && filters.sector_lead_id !== '') {
    params.sector_lead_id = Number(filters.sector_lead_id)
  }

  if (filters.mine_only) params.mine_only = true

  return params
}

export function hasActiveChangeLogFilters(filters, variant = 'admin') {
  if (!filters) return false
  if (filters.q?.trim?.()) return true
  if (filters.proposal_id != null && filters.proposal_id !== '') return true
  if (filters.sector) return true
  if (filters.mou_status) return true
  if (filters.changed_by_role) return true
  if (filters.from || filters.to) return true
  if (variant === 'admin' && filters.sector_lead_id) return true
  if (variant === 'sector' && filters.mine_only) return true
  return false
}

/** Normalize filter-options lists to { value, label }. */
export function normalizeFilterOptionList(items) {
  if (!Array.isArray(items)) return []
  return items
    .map((item) => {
      if (item == null) return null
      if (typeof item === 'string') return { value: item, label: item }
      return {
        value: item.value ?? item.key ?? item.id ?? '',
        label: item.label ?? item.name ?? item.value ?? item.key ?? String(item),
      }
    })
    .filter((o) => o?.value != null && o.value !== '')
}
