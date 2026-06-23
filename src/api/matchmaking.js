import client from './client'

function parseList(data, key) {
  if (Array.isArray(data?.[key])) return data[key]
  if (Array.isArray(data)) return data
  return []
}

// --- Generic mm_proposals (V3) ---

export async function saveMmProposalDraft(data) {
  const response = await client.post('/api/matchmaking/proposals/draft', data)
  return response.data
}

export async function submitMmProposal(proposalId) {
  const response = await client.post('/api/matchmaking/proposals/submit', {
    proposal_id: proposalId,
  })
  return response.data
}

export async function uploadMmProposalFile(file, fieldName = 'proposal_file') {
  const formData = new FormData()
  formData.append(fieldName, file)
  const response = await client.post('/api/matchmaking/proposals/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data
}

export async function getMyMmProposals(params = {}) {
  const response = await client.get('/api/matchmaking/proposals/my', { params })
  const data = response.data
  return {
    proposals: parseList(data, 'proposals'),
    count: data?.count ?? parseList(data, 'proposals').length,
  }
}

export async function getMmProposalById(id) {
  const response = await client.get(`/api/matchmaking/proposals/${id}`)
  return response.data?.proposal ?? response.data
}

export async function getFocalPointMmProposals(params = {}) {
  const response = await client.get('/api/matchmaking/proposals/focal-point', { params })
  return parseList(response.data, 'proposals')
}

export async function getForwardedMmProposals(params = {}) {
  const response = await client.get('/api/matchmaking/proposals/forwarded-to-me', { params })
  return parseList(response.data, 'proposals')
}

export async function getAllForMatching(params = {}) {
  const response = await client.get('/api/matchmaking/proposals/all-for-matching', { params })
  const data = response.data
  return {
    sideA:
      parseList(data, 'side_a_proposals') ||
      parseList(data, 'side_a') ||
      parseList(data, 'sideA'),
    sideB:
      parseList(data, 'side_b_proposals') ||
      parseList(data, 'side_b') ||
      parseList(data, 'sideB'),
  }
}

export async function shortlistMmProposal(id, comment) {
  const body = comment?.trim() ? { comment: comment.trim() } : {}
  const response = await client.patch(`/api/matchmaking/proposals/${id}/shortlist`, body)
  return response.data
}

export async function rejectMmProposal(id, comment) {
  const response = await client.patch(`/api/matchmaking/proposals/${id}/reject`, {
    comment: comment.trim(),
  })
  return response.data
}

export async function forwardMmProposal(id, body = {}) {
  const response = await client.patch(`/api/matchmaking/proposals/${id}/forward`, body)
  return response.data
}

// --- Matches (V3 — reuses engagement + MOU) ---

export async function createMmMatch(sideAProposalId, sideBProposalId, comment) {
  const body = {
    side_a_proposal_id: sideAProposalId,
    side_b_proposal_id: sideBProposalId,
  }
  if (comment?.trim()) body.comment = comment.trim()
  const response = await client.post('/api/matchmaking/matches', body)
  return response.data
}

export async function getMatcherMmMatches(params = {}) {
  const response = await client.get('/api/matchmaking/matches/matched', { params })
  return parseList(response.data, 'matches')
}

export async function getMyMmMatches(params = {}) {
  const response = await client.get('/api/matchmaking/matches/my', { params })
  return parseList(response.data, 'matches')
}

export async function getAllMmMatches(params = {}) {
  const response = await client.get('/api/matchmaking/matches/all', { params })
  return parseList(response.data, 'matches')
}

export async function getMatchById(id) {
  const response = await client.get(`/api/matchmaking/matches/${id}`)
  const data = response.data
  return data?.match ?? data
}

export async function approveMatch(id, comment) {
  const body = comment?.trim() ? { comment: comment.trim() } : {}
  const response = await client.patch(`/api/matchmaking/matches/${id}/approve`, body)
  return response.data
}

export async function rejectMatch(id, comment) {
  const response = await client.patch(`/api/matchmaking/matches/${id}/reject`, {
    comment: comment.trim(),
  })
  return response.data
}

export async function getEngagementMatch(engagementProposalId) {
  const response = await client.get(
    `/api/matchmaking/engagement/${engagementProposalId}/match`,
  )
  const data = response.data
  return data?.match ?? data
}

// --- MOU (unchanged — engagement reuse) ---

export async function getMatchMou(matchId) {
  const response = await client.get(`/api/matchmaking/matches/${matchId}/mou`)
  return response.data
}

export async function getMatchMouAckStatus(matchId) {
  const response = await client.get(`/api/matchmaking/matches/${matchId}/mou/status`)
  return response.data
}

export async function acknowledgeMatchMou(matchId) {
  const response = await client.patch(`/api/matchmaking/matches/${matchId}/mou/acknowledge`)
  return response.data
}

export async function closeMatchDeal(matchId) {
  const response = await client.patch(`/api/matchmaking/matches/${matchId}/close-deal`)
  return response.data
}

export async function getMatchMouVersions(matchId) {
  const response = await client.get(`/api/matchmaking/matches/${matchId}/mou/versions`)
  return response.data
}

export async function saveMatchMou(matchId, fields, file) {
  const formData = new FormData()
  const textFields = [
    'mou_scope',
    'mou_description',
    'mou_sector',
    'mou_demand',
    'mou_status',
  ]
  for (const key of textFields) {
    const val = fields[key]
    if (val != null && String(val).trim() !== '') {
      formData.append(key, String(val).trim())
    }
  }
  if (file) formData.append('mou_file', file)

  const response = await client.patch(`/api/matchmaking/matches/${matchId}/mou`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data
}
