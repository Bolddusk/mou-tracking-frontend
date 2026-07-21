import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import * as authApi from '../api/auth'
import {
  AUTH_RBAC_KEY,
  AUTH_REDIRECT_KEY,
  AUTH_TOKEN_KEY,
  AUTH_USER_KEY,
  ROLES,
} from '../constants/sectors'
import { can as checkPermission, resolveDashboardPath } from '../utils/rbac'

const AuthContext = createContext(null)

function readStoredAuth() {
  try {
    const token = localStorage.getItem(AUTH_TOKEN_KEY)
    const userRaw = localStorage.getItem(AUTH_USER_KEY)
    const rbacRaw = localStorage.getItem(AUTH_RBAC_KEY)
    const redirect = localStorage.getItem(AUTH_REDIRECT_KEY)
    if (!token || !userRaw) {
      return { token: null, user: null, rbac: null, redirect: null }
    }
    return {
      token,
      user: JSON.parse(userRaw),
      rbac: rbacRaw ? JSON.parse(rbacRaw) : null,
      redirect: redirect || null,
    }
  } catch {
    return { token: null, user: null, rbac: null, redirect: null }
  }
}

function persistSession({ token, user, rbac, redirect }) {
  localStorage.setItem(AUTH_TOKEN_KEY, token)
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user))
  if (rbac) localStorage.setItem(AUTH_RBAC_KEY, JSON.stringify(rbac))
  else localStorage.removeItem(AUTH_RBAC_KEY)
  if (redirect) localStorage.setItem(AUTH_REDIRECT_KEY, redirect)
  else localStorage.removeItem(AUTH_REDIRECT_KEY)
}


export function AuthProvider({ children }) {
  const stored = readStoredAuth()
  const [token, setToken] = useState(stored.token)
  const [user, setUser] = useState(stored.user)
  const [rbac, setRbac] = useState(stored.rbac)
  const [redirect, setRedirect] = useState(stored.redirect)

  const applyAuthPayload = useCallback((data) => {
    const normalizedRedirect = data.redirect ?? data.rbac?.redirect ?? null
    if (data.token && data.user) {
      const next = {
        token: data.token,
        user: data.user,
        rbac: data.rbac ?? null,
        redirect: normalizedRedirect,
      }
      persistSession(next)
      setToken((prev) => (prev === next.token ? prev : next.token))
      setUser((prev) =>
        JSON.stringify(prev) === JSON.stringify(next.user) ? prev : next.user,
      )
      setRbac((prev) =>
        JSON.stringify(prev) === JSON.stringify(next.rbac) ? prev : next.rbac,
      )
      setRedirect((prev) => (prev === next.redirect ? prev : next.redirect))
    } else if (data.rbac) {
      localStorage.setItem(AUTH_RBAC_KEY, JSON.stringify(data.rbac))
      setRbac((prev) =>
        JSON.stringify(prev) === JSON.stringify(data.rbac) ? prev : data.rbac,
      )
      if (normalizedRedirect) {
        localStorage.setItem(AUTH_REDIRECT_KEY, normalizedRedirect)
        setRedirect((prev) => (prev === normalizedRedirect ? prev : normalizedRedirect))
      }
    }
  }, [])

  const login = useCallback(
    async (email, password) => {
      const data = await authApi.login({ email, password })
      applyAuthPayload(data)
      if (data.user?.must_change_password) return '/auth/change-password'
      return (
        data.redirect ||
        resolveDashboardPath({ redirect: data.redirect, rbac: data.rbac, user: data.user })
      )
    },
    [applyAuthPayload],
  )

  const changePassword = useCallback(
    async (currentPassword, newPassword) => {
      const data = await authApi.changePassword(currentPassword, newPassword)
      applyAuthPayload(data)
      return (
        data.redirect ||
        resolveDashboardPath({ redirect: data.redirect, rbac: data.rbac, user: data.user })
      )
    },
    [applyAuthPayload],
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
      applyAuthPayload({
        token: data.token || token,
        user: data.user,
        rbac: data.rbac,
        redirect: data.redirect,
      })
      return data
    },
    [token, applyAuthPayload],
  )

  const register = useCallback(
    async (payload) => {
      const data = await authApi.register(payload)
      applyAuthPayload(data)
      return (
        data.redirect ||
        resolveDashboardPath({ redirect: data.redirect, rbac: data.rbac, user: data.user })
      )
    },
    [applyAuthPayload],
  )

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_TOKEN_KEY)
    localStorage.removeItem(AUTH_USER_KEY)
    localStorage.removeItem(AUTH_RBAC_KEY)
    localStorage.removeItem(AUTH_REDIRECT_KEY)
    setToken(null)
    setUser(null)
    setRbac(null)
    setRedirect(null)
  }, [])

  const refreshSession = useCallback(async () => {
    if (!token) return
    try {
      const data = await authApi.getMe()
      applyAuthPayload({
        token,
        user: data.user,
        rbac: data.rbac,
        redirect: data.redirect,
      })
    } catch {
      // 401 handled by API client interceptor
    }
  }, [token, applyAuthPayload])

  const refreshPermissions = useCallback(async () => {
    if (!token) return null
    try {
      const data = await authApi.getPermissions()
      const nextRbac = data?.rbac ?? data
      if (nextRbac?.permissions || nextRbac?.navigation) {
        localStorage.setItem(AUTH_RBAC_KEY, JSON.stringify(nextRbac))
        setRbac((prev) =>
          JSON.stringify(prev) === JSON.stringify(nextRbac) ? prev : nextRbac,
        )
        const nextRedirect = data?.redirect ?? nextRbac?.redirect
        if (nextRedirect) {
          localStorage.setItem(AUTH_REDIRECT_KEY, nextRedirect)
          setRedirect((prev) => (prev === nextRedirect ? prev : nextRedirect))
        }
      }
      return nextRbac
    } catch {
      return null
    }
  }, [token])

  // Refresh session once when token appears (login / app boot) — not on every rbac update.
  useEffect(() => {
    if (!token) return undefined
    let cancelled = false
    ;(async () => {
      try {
        const data = await authApi.getMe()
        if (cancelled) return
        applyAuthPayload({
          token,
          user: data.user,
          rbac: data.rbac,
          redirect: data.redirect ?? data.rbac?.redirect ?? null,
        })
      } catch {
        // 401 handled by API client interceptor
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token, applyAuthPayload])

  const can = useCallback((permission) => checkPermission(rbac, permission), [rbac])

  const dashboardPath = useMemo(
    () => resolveDashboardPath({ redirect, rbac, user }),
    [redirect, rbac, user],
  )

  const value = useMemo(
    () => ({
      token,
      user,
      rbac,
      redirect,
      isAuthenticated: Boolean(token && user),
      isPartyA: user?.role === ROLES.PARTY_A,
      isPartyB: user?.role === ROLES.PARTY_B,
      isPartyMember: user?.role === ROLES.PARTY_A || user?.role === ROLES.PARTY_B,
      isSectorLead: user?.role === ROLES.SECTOR_LEAD,
      isSuperAdmin: user?.role === ROLES.SUPER_ADMIN,
      isPowerAdmin: user?.role === ROLES.POWER_ADMIN,
      isRegionalFocalPoint: user?.role === ROLES.REGIONAL_FOCAL_POINT,
      isInvestor: user?.role === ROLES.INVESTOR,
      isFocalPoint: user?.role === ROLES.FOCAL_POINT,
      ministryId: user?.ministry_id ?? null,
      ministry: user?.ministry ?? null,
      isGlobal: user?.is_global === true || user?.role === ROLES.SUPER_ADMIN || user?.role === ROLES.POWER_ADMIN,
      mustChangePassword: Boolean(user?.must_change_password),
      can,
      login,
      register,
      logout,
      changePassword,
      updateProfile,
      updateUser,
      refreshSession,
      refreshPermissions,
      dashboardPath,
    }),
    [
      token,
      user,
      rbac,
      redirect,
      can,
      login,
      register,
      logout,
      changePassword,
      updateProfile,
      updateUser,
      refreshSession,
      refreshPermissions,
      dashboardPath,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
