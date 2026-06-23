export function getPartyADisplay(proposal) {
  if (!proposal) return '—'
  const pa = proposal.party_a_info
  if (pa?.contact_name || pa?.organization_name) {
    return [pa.contact_name, pa.organization_name].filter(Boolean).join(' · ')
  }
  return proposal.party_a_name || '—'
}

export function getPartyBDisplay(proposal) {
  if (!proposal) return '—'
  if (!proposal.party_b_name && !proposal.party_b_organization) return '—'
  return [proposal.party_b_name, proposal.party_b_organization].filter(Boolean).join(' · ')
}

/** User-facing labels from API poke_status (backend may still say "poke"). */
export function formatUpdateRequestLabel(text) {
  if (!text || text === '—') return text
  return text
    .replace(/Poked by/gi, 'Update requested by')
    .replace(/\bpoked\b/gi, 'update requested')
    .replace(/\bPoke\b/gi, 'Update request')
}
