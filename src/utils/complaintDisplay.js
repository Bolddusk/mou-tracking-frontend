/** MOU title for complaint rows — prefer API `proposal_title`, never force "Untitled". */
export function getComplaintMouTitle(complaint) {
  if (!complaint) return '—'
  const title =
    complaint.proposal_title ||
    complaint.venture_name ||
    complaint.pakistani_company ||
    complaint.proposal_company_name ||
    complaint.company_name ||
    complaint.display_title
  const trimmed = String(title || '').trim()
  return trimmed || '—'
}

export const COMPLAINT_PRIORITY_LABELS = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
}

export const COMPLAINT_CATEGORY_LABELS = {
  delay: 'Delay',
  documentation: 'Documentation',
  communication: 'Communication',
  misconduct: 'Misconduct',
  other: 'Other',
}

export function formatComplaintPriority(priority) {
  if (!priority) return '—'
  return COMPLAINT_PRIORITY_LABELS[priority] || priority
}

export function formatComplaintCategory(category) {
  if (!category) return '—'
  return COMPLAINT_CATEGORY_LABELS[category] || category
}

export function priorityBadgeClass(priority) {
  const key = String(priority || '').toLowerCase()
  if (key === 'high') return 'bg-red-50 text-red-800 ring-red-200'
  if (key === 'low') return 'bg-slate-50 text-slate-600 ring-slate-200'
  return 'bg-amber-50 text-amber-900 ring-amber-200'
}
