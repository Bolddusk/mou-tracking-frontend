import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import * as profileApi from '../../api/profile'
import * as usersApi from '../../api/users'
import { ActionGroup, IconButton, ViewIcon } from '../../components/ActionIcons'
import Alert from '../../components/Alert'
import LoadingSpinner from '../../components/LoadingSpinner'
import UserRoleBadge from '../../components/UserRoleBadge'
import { ROLES } from '../../constants/sectors'
import { getPartyAProfilePaths, getPartyBProfilePaths } from '../../constants/profileRoutes'
import { useAuth } from '../../context/AuthContext'
import * as ministriesApi from '../../api/ministries'
import { formatDate, getErrorMessage } from '../../utils/format'

function PartyAProfileStatusBadge({ user, profileMeta }) {
  if (user.role !== ROLES.PARTY_A) {
    return <span className="text-slate-400">—</span>
  }

  if (!profileMeta) {
    return (
      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
        No profile
      </span>
    )
  }

  if (profileMeta.profile_complete) {
    return (
      <span className="inline-flex rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">
        Complete ✓
      </span>
    )
  }

  return (
    <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
      Incomplete
    </span>
  )
}

function mergeTabs(fromList, fromTabsEndpoint) {
  const byKey = new Map()
  for (const t of usersApi.USER_LIST_TABS) {
    byKey.set(t.key, { ...t, count: null })
  }
  for (const t of fromTabsEndpoint || []) {
    if (!t?.key) continue
    byKey.set(t.key, {
      key: t.key,
      label: t.label || byKey.get(t.key)?.label || t.key,
      count: t.count ?? byKey.get(t.key)?.count,
    })
  }
  for (const t of fromList || []) {
    if (!t?.key) continue
    const prev = byKey.get(t.key) || { key: t.key, label: t.label || t.key, count: null }
    byKey.set(t.key, {
      ...prev,
      label: t.label || prev.label,
      count: t.count ?? prev.count,
    })
  }
  return usersApi.USER_LIST_TABS.map((t) => byKey.get(t.key)).filter(Boolean)
}

export default function UsersList() {
  const navigate = useNavigate()
  const location = useLocation()
  const [users, setUsers] = useState([])
  const [tabs, setTabs] = useState(() =>
    usersApi.USER_LIST_TABS.map((t) => ({ ...t, count: null })),
  )
  const [total, setTotal] = useState(0)
  const [profileByUserId, setProfileByUserId] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(location.state?.success || '')
  const [activeTab, setActiveTab] = useState('party_a')
  const [search, setSearch] = useState('')
  const [ministryFilter, setMinistryFilter] = useState('')
  const [ministries, setMinistries] = useState([])
  const { isSuperAdmin, isPowerAdmin, isGlobal } = useAuth()

  const partyAProfilePaths = getPartyAProfilePaths(ROLES.SUPER_ADMIN)
  const partyBProfilePaths = getPartyBProfilePaths(ROLES.SUPER_ADMIN)

  useEffect(() => {
    usersApi
      .getUserTabs()
      .then((res) => {
        const list = Array.isArray(res?.tabs) ? res.tabs : Array.isArray(res) ? res : []
        if (list.length) setTabs((prev) => mergeTabs(prev, list))
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!isGlobal) return
    ministriesApi
      .listMinistries()
      .then((res) => setMinistries(res.data || []))
      .catch(() => setMinistries([]))
  }, [isGlobal])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = { tab: activeTab }
      if (search.trim()) params.search = search.trim()
      if (ministryFilter) params.ministry_id = ministryFilter

      const [usersBody, profilesData] = await Promise.all([
        usersApi.listUsers(params),
        activeTab === 'party_a'
          ? profileApi.getPartyAProfiles().catch(() => ({ profiles: [] }))
          : Promise.resolve({ profiles: [] }),
      ])

      const normalized = usersApi.normalizeUsersListResponse(usersBody)
      setUsers(normalized.data)
      setTotal(normalized.total)
      if (normalized.tabs.length) {
        setTabs((prev) => mergeTabs(normalized.tabs, prev))
      }

      const map = {}
      for (const p of profilesData.profiles || []) {
        map[p.id] = p
      }
      setProfileByUserId(map)
    } catch (err) {
      setError(getErrorMessage(err))
      setUsers([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [activeTab, search, ministryFilter])

  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0)
    return () => clearTimeout(t)
  }, [load, search])

  useEffect(() => {
    if (!location.state?.success) return
    setSuccess(location.state.success)
    navigate(location.pathname, { replace: true, state: {} })
  }, [location.pathname, location.state, navigate])

  const partyAStats = useMemo(() => {
    if (activeTab !== 'party_a') return null
    let complete = 0
    let incomplete = 0
    for (const u of users) {
      const meta = profileByUserId[u.id]
      if (meta?.profile_complete) complete++
      else incomplete++
    }
    return { total: users.length, complete, incomplete }
  }, [users, profileByUserId, activeTab])

  const showPartyAProfileCol = activeTab === 'party_a'

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">User Management</h3>
          <p className="text-sm text-slate-500">Manage portal accounts, roles, and access</p>
        </div>
        <Link
          to="/admin/users/new"
          className="inline-flex items-center justify-center rounded-lg bg-portal-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-portal-primary-hover"
        >
          Add User
        </Link>
      </div>

      <Alert type="error" message={error} onClose={() => setError('')} />
      <Alert type="success" message={success} onClose={() => setSuccess('')} />

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <nav
          className="flex flex-wrap gap-1 border-b border-slate-200 px-4 pt-2"
          aria-label="User roles"
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-t-lg px-4 py-2.5 text-sm font-semibold transition ${
                  isActive
                    ? 'border border-b-white border-slate-200 bg-white text-portal-primary'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                {tab.label}
                {tab.count != null && (
                  <span
                    className={`ml-2 inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        <div className="space-y-4 p-4">
          {partyAStats && (
            <p className="text-sm text-slate-600">
              Party A profiles:{' '}
              <span className="font-semibold text-green-700">{partyAStats.complete} complete</span>
              {' · '}
              <span className="font-semibold text-amber-700">
                {partyAStats.incomplete} incomplete
              </span>
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            {(isSuperAdmin || isPowerAdmin || isGlobal) && ministries.length > 0 && (
              <select
                value={ministryFilter}
                onChange={(e) => setMinistryFilter(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <option value="">All ministries</option>
                {ministries.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            )}
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, organization…"
              className="min-w-[220px] flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-portal-primary focus:ring-2 focus:ring-portal-primary/30"
            />
            <p className="text-xs text-slate-500">
              {loading ? 'Loading…' : `${total} user${total === 1 ? '' : 's'}`}
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <LoadingSpinner size="lg" />
            </div>
          ) : users.length === 0 ? (
            <div className="py-16 text-center text-slate-500">No users in this tab.</div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-100">
              <table className="min-w-[960px] w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Name</th>
                    <th className="px-4 py-3 font-semibold">Email</th>
                    <th className="px-4 py-3 font-semibold">Role</th>
                    <th className="px-4 py-3 font-semibold">Ministry</th>
                    <th className="px-4 py-3 font-semibold">Sector</th>
                    <th className="px-4 py-3 font-semibold">Organization</th>
                    {showPartyAProfileCol && (
                      <th className="px-4 py-3 font-semibold">Party A Profile</th>
                    )}
                    <th className="px-4 py-3 font-semibold">Created</th>
                    <th className="px-4 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3 font-medium text-slate-800">{u.full_name}</td>
                      <td className="px-4 py-3 text-slate-600">{u.email}</td>
                      <td className="px-4 py-3">
                        <UserRoleBadge role={u.role} label={u.role_label} />
                      </td>
                      <td className="max-w-[160px] truncate px-4 py-3 text-slate-600">
                        {u.ministry?.name || u.ministry_name || '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{u.sector || '—'}</td>
                      <td className="max-w-[140px] truncate px-4 py-3 text-slate-600">
                        {u.organization || '—'}
                      </td>
                      {showPartyAProfileCol && (
                        <td className="px-4 py-3">
                          <PartyAProfileStatusBadge
                            user={u}
                            profileMeta={profileByUserId[u.id]}
                          />
                        </td>
                      )}
                      <td className="px-4 py-3 text-slate-600">{formatDate(u.created_at)}</td>
                      <td className="px-4 py-3">
                        <ActionGroup>
                          <IconButton
                            variant="view"
                            title="View user"
                            onClick={() => navigate(`/admin/users/${u.id}`)}
                          >
                            <ViewIcon />
                          </IconButton>
                          {u.role === ROLES.PARTY_A && (
                            <button
                              type="button"
                              title="View Party A Profile"
                              onClick={() => navigate(partyAProfilePaths.detail(u.id))}
                              className="rounded-lg border border-green-200 px-2.5 py-1 text-[11px] font-semibold text-green-800 hover:bg-green-50"
                            >
                              View Profile
                            </button>
                          )}
                          {u.role === ROLES.PARTY_B && (
                            <button
                              type="button"
                              title="View Party B Profile"
                              onClick={() => navigate(partyBProfilePaths.detail(u.id))}
                              className="rounded-lg border border-green-200 px-2.5 py-1 text-[11px] font-semibold text-green-800 hover:bg-green-50"
                            >
                              View Profile
                            </button>
                          )}
                        </ActionGroup>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
