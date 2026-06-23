import axios from 'axios'
import { AUTH_TOKEN_KEY, AUTH_USER_KEY } from '../constants/sectors'

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { 'Content-Type': 'application/json' },
})

client.interceptors.request.use((config) => {
  const token = localStorage.getItem(AUTH_TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(AUTH_TOKEN_KEY)
      localStorage.removeItem(AUTH_USER_KEY)
      if (!window.location.pathname.startsWith('/auth')) {
        window.location.href = '/auth/login'
      }
    }
    return Promise.reject(error)
  },
)

export default client
