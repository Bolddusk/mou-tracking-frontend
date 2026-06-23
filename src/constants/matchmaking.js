import { SECTORS } from './sectors'

export const MM_SIDES = [
  { value: 'side_a', label: 'Side A' },
  { value: 'side_b', label: 'Side B' },
]

export const MM_PROPOSAL_STATUS_STYLES = {
  draft: 'bg-slate-100 text-slate-700 border-slate-200',
  submitted: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  shortlisted: 'bg-green-100 text-green-800 border-green-200',
  rejected: 'bg-red-100 text-red-800 border-red-200',
  forwarded: 'bg-blue-100 text-blue-800 border-blue-200',
  matched: 'bg-emerald-100 text-emerald-800 border-emerald-200',
}

export const MM_PROPOSAL_STATUS_LABELS = {
  draft: 'Draft',
  submitted: 'Submitted',
  shortlisted: 'Shortlisted',
  rejected: 'Rejected',
  forwarded: 'Forwarded',
  matched: 'Matched',
}

export const MM_PROPOSAL_STATUS_FILTERS = [
  { key: '', label: 'All' },
  { key: 'submitted', label: 'Submitted' },
  { key: 'shortlisted', label: 'Shortlisted' },
  { key: 'forwarded', label: 'Forwarded' },
  { key: 'matched', label: 'Matched' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'draft', label: 'Draft' },
]

export const MM_MATCH_STATUS_STYLES = {
  created: 'bg-slate-100 text-slate-700 border-slate-200',
  pending_review: 'bg-amber-100 text-amber-800 border-amber-200',
  approved: 'bg-green-100 text-green-800 border-green-200',
  rejected: 'bg-red-100 text-red-800 border-red-200',
}

export const MM_MATCH_STATUS_LABELS = {
  created: 'Created',
  pending_review: 'Pending review',
  approved: 'Approved',
  rejected: 'Rejected',
}

export const MM_MOU_STATUS_STYLES = {
  not_started: 'bg-slate-100 text-slate-700 border-slate-200',
  in_progress: 'bg-blue-100 text-blue-800 border-blue-200',
  uploaded: 'bg-amber-100 text-amber-800 border-amber-200',
  signed: 'bg-green-100 text-green-800 border-green-200',
  deal_closed: 'bg-slate-200 text-slate-800 border-slate-300',
}

export const MM_MOU_STATUS_LABELS = {
  not_started: 'Not started',
  in_progress: 'In progress',
  uploaded: 'Uploaded',
  signed: 'Signed',
  deal_closed: 'Deal Closed',
}

export const MM_MOU_STATUS_ORDER = [
  'not_started',
  'in_progress',
  'uploaded',
  'signed',
  'deal_closed',
]

export { SECTORS as MM_SECTORS }

export const MM_PROPOSAL_STEPS = [
  { num: 1, label: 'Engagement & Conference' },
  { num: 2, label: 'Your Organization' },
  { num: 3, label: 'Cover' },
  { num: 4, label: 'Executive Summary' },
  { num: 5, label: 'Company Overview' },
  { num: 6, label: 'Project Overview' },
  { num: 7, label: 'Financials' },
  { num: 8, label: 'Investment Ask' },
  { num: 9, label: 'Contact' },
]

export const MM_TOTAL_STEPS = 9

/** MM wizard step (1–9) → legacy Direct MOU step content id */
export const MM_STEP_LEGACY = {
  1: 1,
  2: 2,
  3: 4,
  4: 5,
  5: 6,
  6: 7,
  7: 8,
  8: 9,
  9: 10,
}

export function mmContentStep(wizardStep) {
  return MM_STEP_LEGACY[wizardStep] ?? wizardStep
}

export function defaultSideForRole(role) {
  if (role === 'party_a') return 'side_a'
  if (role === 'investor') return 'side_b'
  return 'side_a'
}

/** V3 matches use active/mou_pending; legacy used approved/created */
export function isMatchMouReady(status) {
  const key = (status || '').toLowerCase()
  return ['approved', 'created', 'active', 'mou_pending'].includes(key)
}

export function getMmProposalSearchText(p) {
  if (!p) return ''
  const parts = [
    p.country,
    p.sector,
    p.title,
    p.description,
    p.submitter_name,
    p.submitter_email,
    p.status,
    p.id != null ? String(p.id) : '',
    ...(Array.isArray(p.keywords) ? p.keywords : []),
  ]
  return parts.filter(Boolean).join(' ').toLowerCase()
}

export function filterMmProposalsBySearch(items, query) {
  const q = query?.trim().toLowerCase()
  if (!q) return items
  return items.filter((p) => getMmProposalSearchText(p).includes(q))
}

export function parseKeywordsInput(value) {
  if (!value?.trim()) return []
  return value
    .split(/[,;]+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

export function formatKeywordsDisplay(keywords) {
  if (!keywords) return ''
  if (Array.isArray(keywords)) return keywords.filter(Boolean).join(', ')
  if (typeof keywords === 'object') {
    const tags = []
    if (keywords.file_url) tags.push('Proposal file attached')
    const extras = Object.entries(keywords)
      .filter(([key, value]) => key !== 'file_url' && value != null && String(value).trim())
      .map(([, value]) => String(value).trim())
    return [...tags, ...extras].join(', ')
  }
  return String(keywords)
}
