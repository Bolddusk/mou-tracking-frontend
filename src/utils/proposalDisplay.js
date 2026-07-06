/** Pakistani company column — never use party_a_name (import owner user). */
export function getPakistaniCompanyDisplay(proposal) {
  if (!proposal) return '—'
  return proposal.pakistani_company ?? proposal.company_name ?? '—'
}

/** Chinese company column. */
export function getChineseCompanyDisplay(proposal) {
  if (!proposal) return '—'
  return (
    proposal.chinese_company ??
    proposal.party_b_info?.organization_name ??
    proposal.party_b_name ??
    '—'
  )
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

export function normalizeLoginEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : value
}

function legacyPartyAContactItems(proposal) {
  return [
    { label: 'Company', value: getPakistaniCompanyDisplay(proposal) },
    { label: 'Contact', value: proposal?.party_a_info?.contact_name },
    {
      label: 'Organization',
      value: proposal?.party_a_info?.organization_name || proposal?.party_a_organization,
    },
    { label: 'Email', value: proposal?.party_a_info?.email || proposal?.party_a_email },
    { label: 'Phone', value: proposal?.party_a_info?.phone || proposal?.party_a_phone },
  ].filter((row) => row.value && row.value !== '—')
}

function legacyPartyBContactItems(proposal) {
  const b = proposal?.party_b_info || {}
  return [
    { label: 'Company', value: getChineseCompanyDisplay(proposal) },
    { label: 'Contact', value: b.contact_name || proposal?.party_b_name },
    {
      label: 'Organization',
      value: b.organization_name || proposal?.party_b_organization,
    },
    { label: 'Email', value: b.email || proposal?.party_b_email },
    { label: 'Phone', value: b.phone || proposal?.party_b_phone },
    { label: 'Country', value: b.country || proposal?.party_b_country },
  ].filter((row) => row.value && row.value !== '—')
}

/** Deduped proposal contact rows from API (fallback for older responses). */
export function getPartyAContactItems(proposal) {
  const items = proposal?.party_a_contacts_display?.items
  if (Array.isArray(items) && items.length > 0) return items
  return legacyPartyAContactItems(proposal)
}

export function getPartyBContactItems(proposal) {
  const items = proposal?.party_b_contacts_display?.items
  if (Array.isArray(items) && items.length > 0) return items
  return legacyPartyBContactItems(proposal)
}

export function getPartyALoginEmail(proposal) {
  return (
    proposal?.party_a_contacts_display?.login_email ||
    proposal?.party_a_profile?.data?.user?.email ||
    proposal?.party_a_info?.email ||
    proposal?.party_a_email ||
    ''
  )
}

export function getPartyBLoginEmail(proposal) {
  return (
    proposal?.party_b_contacts_display?.login_email ||
    proposal?.party_b_profile?.data?.user?.email ||
    proposal?.party_b_info?.email ||
    proposal?.party_b_email ||
    ''
  )
}
