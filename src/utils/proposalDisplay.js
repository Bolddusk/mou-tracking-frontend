/** Pakistani company column — never use party_a_name (import owner user). */
export function getPakistaniCompanyDisplay(proposal) {
  if (!proposal) return '—'
  return proposal.pakistani_company ?? proposal.company_name ?? '—'
}

/** Chinese company column. */
export function getChineseCompanyDisplay(proposal) {
  if (!proposal) return '—'
  return proposal.chinese_company ?? proposal.party_b_name ?? '—'
}

/** @deprecated Use getPakistaniCompanyDisplay for list/table company columns. */
export function getPartyADisplay(proposal) {
  return getPakistaniCompanyDisplay(proposal)
}

/** @deprecated Use getChineseCompanyDisplay for list/table company columns. */
export function getPartyBDisplay(proposal) {
  return getChineseCompanyDisplay(proposal)
}

/** User-facing labels from API poke_status (backend may still say "poke"). */
export function formatUpdateRequestLabel(text) {
  if (!text || text === '—') return text
  return text
    .replace(/Poked by/gi, 'Update requested by')
    .replace(/\bpoked\b/gi, 'update requested')
    .replace(/\bPoke\b/gi, 'Update request')
}
