import client from './client'

export async function getProfile() {
  const response = await client.get('/api/profile')
  return response.data
}

export async function getProfileSectors() {
  const response = await client.get('/api/profile/sectors')
  return response.data
}

export async function updateProfile(payload) {
  const response = await client.patch('/api/profile', payload)
  return response.data
}

export async function uploadProfileDocument({ file, docType, title, description }) {
  const formData = new FormData()
  formData.append('document', file)
  formData.append('doc_type', docType)
  if (title) formData.append('title', title)
  if (description) formData.append('description', description)

  const response = await client.post('/api/profile/documents', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data
}

export async function deleteProfileDocument(id) {
  const response = await client.delete(`/api/profile/documents/${id}`)
  return response.data
}

export async function getPartyAProfiles() {
  const response = await client.get('/api/profile/party-a')
  return response.data
}

export async function getProfileByUserId(userId) {
  const response = await client.get(`/api/profile/${userId}`)
  return response.data
}
