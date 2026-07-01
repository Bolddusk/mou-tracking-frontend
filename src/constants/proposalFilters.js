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

/** Build query params for GET /api/proposals/all (omit empty values). */
export function buildProposalListParams({
  status = '',
  sector = '',
  mou_status = '',
  q = '',
  date_from = '',
  date_to = '',
  has_mou = '',
  has_pitch = '',
  deal_closed = '',
} = {}) {
  const params = {}
  if (status) params.status = status
  if (sector) params.sector = sector
  if (mou_status) params.mou_status = mou_status
  const trimmedQ = q?.trim()
  if (trimmedQ) params.q = trimmedQ
  if (date_from) params.date_from = date_from
  if (date_to) params.date_to = date_to
  if (has_mou === 'true' || has_mou === 'false') params.has_mou = has_mou
  if (has_pitch === 'true' || has_pitch === 'false') params.has_pitch = has_pitch
  if (deal_closed === 'true' || deal_closed === 'false') params.deal_closed = deal_closed
  return params
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
