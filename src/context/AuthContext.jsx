import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import * as authApi from '../api/auth'
import { AUTH_TOKEN_KEY, AUTH_USER_KEY, ROLES } from '../constants/sectors'

const AuthContext = createContext(null)

function readStoredAuth() {
  try {
    const token = localStorage.getItem(AUTH_TOKEN_KEY)
    const userRaw = localStorage.getItem(AUTH_USER_KEY)
    if (!token || !userRaw) return { token: null, user: null }
    return { token, user: JSON.parse(userRaw) }
  } catch {
    return { token: null, user: null }
  }
}

function dashboardPathForRole(role) {
  if (role === ROLES.PARTY_A) return '/dashboard/party-a'
  if (role === ROLES.PARTY_B) return '/dashboard/party-b'
  if (role === ROLES.SECTOR_LEAD) return '/dashboard/sector-lead'
  if (role === ROLES.SUPER_ADMIN) return '/dashboard/super-admin'
  if (role === ROLES.REGIONAL_FOCAL_POINT) return '/dashboard/regional-focal'
  if (role === ROLES.INVESTOR) return '/matchmaking/my-proposals'
  if (role === ROLES.FOCAL_POINT) return '/matchmaking/focal-point'
  return '/auth/login'
}

export function AuthProvider({ children }) {
  const stored = readStoredAuth()
  const [token, setToken] = useState(stored.token)
  const [user, setUser] = useState(stored.user)

  const persistAuth = useCallback((nextToken, nextUser) => {
    localStorage.setItem(AUTH_TOKEN_KEY, nextToken)
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(nextUser))
    setToken(nextToken)
    setUser(nextUser)
  }, [])

  const login = useCallback(async (email, password) => {
    const data = await authApi.login({ email, password })
    persistAuth(data.token, data.user)
    if (data.user?.must_change_password) return '/auth/change-password'
    return data.redirect || dashboardPathForRole(data.user.role)
  }, [persistAuth])

  const changePassword = useCallback(
    async (currentPassword, newPassword) => {
      const data = await authApi.changePassword(currentPassword, newPassword)
      persistAuth(data.token, data.user)
      return data.redirect || dashboardPathForRole(data.user.role)
    },
    [persistAuth],
  )

  const updateUser = useCallback(
    (nextUser) => {
      if (!token) return
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(nextUser))
      setUser(nextUser)
    },
    [token],
  )

  const updateProfile = useCallback(
    async (payload) => {
      const data = await authApi.updateMe(payload)
      const nextUser = data.user
      const nextToken = data.token || token
      if (nextUser) {
        persistAuth(nextToken, nextUser)
      }
      return data
    },
    [token, persistAuth],
  )

  const register = useCallback(async (payload) => {
    const data = await authApi.register(payload)
    persistAuth(data.token, data.user)
    return data.redirect || dashboardPathForRole(data.user.role)
  }, [persistAuth])

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_TOKEN_KEY)
    localStorage.removeItem(AUTH_USER_KEY)
    setToken(null)
    setUser(null)
  }, [])

  const refreshSession = useCallback(async () => {
    if (!token) return
    try {
      const data = await authApi.getMe()
      if (data?.user) {
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user))
        setUser(data.user)
      }
    } catch {
      // 401 handled by API client interceptor
    }
  }, [token])

  useEffect(() => {
    refreshSession()
  }, [refreshSession])

  const value = useMemo(
    () => ({
      token,
      user,
      isAuthenticated: Boolean(token && user),
      isPartyA: user?.role === ROLES.PARTY_A,
      isPartyB: user?.role === ROLES.PARTY_B,
      isPartyMember: user?.role === ROLES.PARTY_A || user?.role === ROLES.PARTY_B,
      isSectorLead: user?.role === ROLES.SECTOR_LEAD,
      isSuperAdmin: user?.role === ROLES.SUPER_ADMIN,
      isRegionalFocalPoint: user?.role === ROLES.REGIONAL_FOCAL_POINT,
      isInvestor: user?.role === ROLES.INVESTOR,
      isFocalPoint: user?.role === ROLES.FOCAL_POINT,
      mustChangePassword: Boolean(user?.must_change_password),
      login,
      register,
      logout,
      changePassword,
      updateProfile,
      updateUser,
      refreshSession,
      dashboardPath: user ? dashboardPathForRole(user.role) : '/auth/login',
    }),
    [token, user, login, register, logout, changePassword, updateProfile, updateUser, refreshSession],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
