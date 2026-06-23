import client from './client'

export async function getProposalActivities(proposalId) {
  const response = await client.get(`/api/proposals/${proposalId}/activities`)
  return response.data
}

export async function createActivity(proposalId, data) {
  const response = await client.post(`/api/proposals/${proposalId}/activities`, data)
  return response.data
}

export async function uploadActivitySupport(file) {
  const formData = new FormData()
  formData.append('support_file', file)
  const response = await client.post('/api/activities/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data
}

export async function pokeForUpdate(proposalId) {
  const response = await client.post(`/api/proposals/${proposalId}/poke`)
  return response.data
}

export async function respondToPoke(activityId, data) {
  const response = await client.post(`/api/activities/${activityId}/respond`, data)
  return response.data
}

export async function approveActivity(activityId, comment) {
  const response = await client.patch(`/api/activities/${activityId}/approve`, {
    comment: comment || undefined,
  })
  return response.data
}

export async function rejectActivity(activityId, comment) {
  const response = await client.patch(`/api/activities/${activityId}/reject`, { comment })
  return response.data
}

export async function addActivityComment(activityId, comment) {
  const response = await client.post(`/api/activities/${activityId}/comments`, { comment })
  return response.data
}

export async function getActivityComments(activityId) {
  const response = await client.get(`/api/activities/${activityId}/comments`)
  return response.data
}
