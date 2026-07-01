import { getProposalDisplayTitle } from './proposalTemplate'
import { getPartyADisplay, getPartyBDisplay } from '../utils/proposalDisplay'

/** Status filter presets per dashboard role. `key: ''` = All (no API param). */
export const PROPOSAL_STATUS_FILTERS = {
  partyA: [
    { key: '', label: 'All' },
    { key: 'draft', label: 'Draft' },
    { key: 'submitted', label: 'Submitted' },
    { key: 'resubmitted', label: 'Resubmitted' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
  ],
  superAdmin: [
    { key: '', label: 'All' },
    { key: 'draft', label: 'Draft' },
    { key: 'submitted', label: 'Submitted' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
  ],
  sectorLead: [
    { key: '', label: 'All' },
    { key: 'submitted', label: 'Pending' },
    { key: 'resubmitted', label: 'Resubmitted' },
    { key: 'approved', label: 'Approved' },
    { key: 'completed', label: 'Completed' },
    { key: 'rejected', label: 'Rejected' },
  ],
}

export function filterProposalsByStatus(proposals, statusKey) {
  if (!statusKey) return proposals
  return proposals.filter((p) => (p.status || '').toLowerCase() === statusKey)
}

export function getProposalSearchText(proposal) {
  if (!proposal) return ''
  const parts = [
    getProposalDisplayTitle(proposal),
    proposal.venture_name,
    proposal.company_name,
    proposal.proposal_title,
    proposal.display_title,
    getPartyADisplay(proposal),
    getPartyBDisplay(proposal),
    proposal.party_a_name,
    proposal.party_a_organization,
    proposal.party_a_email,
    proposal.party_b_name,
    proposal.party_b_organization,
    proposal.party_a_info?.contact_name,
    proposal.party_a_info?.organization_name,
    proposal.party_b_info?.contact_name,
    proposal.party_b_info?.organization_name,
    proposal.sector,
    proposal.external_reference,
    proposal.cooperation_mode,
    proposal.conference_name,
    proposal.conference_key,
    proposal.id != null ? String(proposal.id) : '',
  ]
  return parts.filter(Boolean).join(' ').toLowerCase()
}

export function filterProposalsBySearch(proposals, query) {
  const q = query?.trim().toLowerCase()
  if (!q) return proposals
  return proposals.filter((p) => getProposalSearchText(p).includes(q))
}

export function filterProposals(proposals, { status = '', search = '' } = {}) {
  return filterProposalsBySearch(filterProposalsByStatus(proposals, status), search)
}

export const BOOL_FILTER_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'true', label: 'Yes' },
  { value: 'false', label: 'No' },
]

export const COOPERATION_MODE_LABELS = {
  mou: 'MoU',
  jv: 'JV',
  agreement: 'Agreement',
}

const DEFAULT_COOPERATION_MODES = ['mou', 'jv', 'agreement']

/** Tab filters for cooperation mode (All + API options). */
export function buildCooperationModeFilters(cooperationModes) {
  const modes =
    Array.isArray(cooperationModes) && cooperationModes.length
      ? cooperationModes
      : DEFAULT_COOPERATION_MODES.map((value) => ({ value, label: COOPERATION_MODE_LABELS[value] }))

  return [
    { key: '', label: 'All' },
    ...modes.map((mode) => {
      const value = typeof mode === 'string' ? mode : mode.value
      const label =
        typeof mode === 'string'
          ? COOPERATION_MODE_LABELS[mode] || mode
          : mode.label || COOPERATION_MODE_LABELS[mode.value] || mode.value
      return { key: value, label }
    }),
  ]
}

/** Build query params for GET /api/proposals/all (omit empty values). */
export function buildProposalListParams({
  status = '',
  sector = '',
  mou_status = '',
  cooperation_mode = '',
  conference_key = '',
  q = '',
  date_from = '',
  date_to = '',
  has_mou = '',
  has_pitch = '',
  deal_closed = '',
  page = 1,
  limit = 20,
} = {}) {
  const params = {}
  if (status) params.status = status
  if (sector) params.sector = sector
  if (mou_status) params.mou_status = mou_status
  if (cooperation_mode) params.cooperation_mode = cooperation_mode
  if (conference_key) params.conference_key = conference_key
  const trimmedQ = q?.trim()
  if (trimmedQ) params.q = trimmedQ
  if (date_from) params.date_from = date_from
  if (date_to) params.date_to = date_to
  if (has_mou === 'true' || has_mou === 'false') params.has_mou = has_mou
  if (has_pitch === 'true' || has_pitch === 'false') params.has_pitch = has_pitch
  if (deal_closed === 'true' || deal_closed === 'false') params.deal_closed = deal_closed
  if (page != null && page > 0) params.page = page
  if (limit != null && limit > 0) params.limit = limit
  return params
}

export const PAGE_SIZE_OPTIONS = [10, 20, 50]

export function getPaginationRange(pagination) {
  if (!pagination?.total) {
    return { start: 0, end: 0, total: 0 }
  }
  const page = pagination.page || 1
  const limit = pagination.limit || 20
  const start = (page - 1) * limit + 1
  const end = Math.min(page * limit, pagination.total)
  return { start, end, total: pagination.total }
}

export function getProposalListEmptyMessage({
  totalCount = 0,
  statusFilter = '',
  searchQuery = '',
  statusFilters = [],
  defaultMessage = 'No opportunities found.',
}) {
  if (totalCount === 0) return defaultMessage
  if (searchQuery.trim()) return 'No opportunities match your search.'
  if (statusFilter) {
    const label = statusFilters.find((f) => f.key === statusFilter)?.label?.toLowerCase()
    if (label) return `No ${label} opportunities.`
  }
  return defaultMessage
}
