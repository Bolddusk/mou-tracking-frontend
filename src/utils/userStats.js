export function hasPortalRecords(stats) {
  if (!stats) return false
  return Object.values(stats).some((n) => Number(n) > 0)
}

export function formatStatsSummary(stats) {
  if (!stats) return ''
  const parts = []
  if (stats.proposals_filed) parts.push(`${stats.proposals_filed} proposal(s) filed`)
  if (stats.proposals_reviewed) parts.push(`${stats.proposals_reviewed} proposal(s) reviewed`)
  if (stats.complaints_filed) parts.push(`${stats.complaints_filed} complaint(s) filed`)
  if (stats.complaints_tagged) parts.push(`${stats.complaints_tagged} complaint(s) tagged`)
  if (stats.complaints_forwarded) parts.push(`${stats.complaints_forwarded} complaint(s) forwarded`)
  if (stats.activities_added) parts.push(`${stats.activities_added} activit${stats.activities_added === 1 ? 'y' : 'ies'}`)
  return parts.join(', ')
}

export function formatReferencesSummary(references) {
  if (!references) return ''
  return formatStatsSummary(references)
}
