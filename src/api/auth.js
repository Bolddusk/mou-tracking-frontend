import client from './client'

export async function register(data) {
  const response = await client.post('/api/auth/register', data)
  return response.data
}

export async function login(data) {
  const response = await client.post('/api/auth/login', data)
  return response.data
}

export async function getMe() {
  const response = await client.get('/api/auth/me')
  return response.data
}

export async function getPermissions() {
  const response = await client.get('/api/auth/permissions')
  return response.data
}

export async function getRbacCatalog() {
  const response = await client.get('/api/auth/rbac/catalog')
  return response.data
}

export async function updateMe(payload) {
  const response = await client.patch('/api/auth/me', payload)
  return response.data
}

export async function changePassword(current_password, new_password) {
  const response = await client.patch('/api/auth/change-password', {
    current_password,
    new_password,
  })
  return response.data
}
