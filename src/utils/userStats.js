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

const REFERENCE_LABELS = [
  ['proposals_as_party_b', 'proposal(s) as Party B'],
  ['proposals_party_b', 'proposal(s) as Party B'],
  ['proposals_filed', 'proposal(s) filed'],
  ['proposals_reviewed', 'proposal(s) reviewed'],
  ['proposals_reviewed_by', 'proposal review(s)'],
  ['proposals_deal_closed_by', 'deal closure(s)'],
  ['deal_closed_by', 'deal closure(s)'],
  ['complaints_as_party_b', 'complaint(s) as Party B'],
  ['complaints_party_b', 'complaint(s) as Party B'],
  ['complaints_filed', 'complaint(s) filed'],
  ['complaints_tagged', 'complaint(s) tagged'],
  ['complaints_forwarded', 'complaint(s) forwarded'],
  ['activities_added', 'activities'],
  ['mm_proposals_reviewed_by', 'matchmaking review(s)'],
  ['mm_proposals_forwarded_to', 'matchmaking forward(s)'],
]

function formatReferenceParts(record) {
  if (!record) return ''
  const parts = []
  for (const [key, label] of REFERENCE_LABELS) {
    const n = Number(record[key])
    if (n > 0) {
      if (key === 'activities_added') {
        parts.push(`${n} activit${n === 1 ? 'y' : 'ies'}`)
      } else {
        parts.push(`${n} ${label}`)
      }
    }
  }
  return parts.join(', ')
}

export function formatReferencesSummary(references) {
  if (!references) return ''
  const fromApi = formatReferenceParts(references)
  if (fromApi) return fromApi
  return formatStatsSummary(references)
}

export function formatUnlinkedSummary(unlinked) {
  return formatReferenceParts(unlinked)
}

export function deleteOffersUnlink(apiData) {
  if (!apiData) return false
  if (String(apiData.hint || '').includes('unlink_references')) return true
  return false
}
