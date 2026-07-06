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

export default function UsersList() {
  const navigate = useNavigate()
  const location = useLocation()
  const [users, setUsers] = useState([])
  const [profileByUserId, setProfileByUserId] = useState({})
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(location.state?.success || '')
  const [roleFilter, setRoleFilter] = useState('')
  const [search, setSearch] = useState('')

  const partyAProfilePaths = getPartyAProfilePaths(ROLES.SUPER_ADMIN)
  const partyBProfilePaths = getPartyBProfilePaths(ROLES.SUPER_ADMIN)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = {}
      if (roleFilter) params.role = roleFilter
      if (search.trim()) params.search = search.trim()

      const [usersData, profilesData] = await Promise.all([
        usersApi.listUsers(params),
        profileApi.getPartyAProfiles().catch(() => ({ profiles: [] })),
      ])

      setUsers(Array.isArray(usersData) ? usersData : [])

      const map = {}
      for (const p of profilesData.profiles || []) {
        map[p.id] = p
      }
      setProfileByUserId(map)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [roleFilter, search])

  useEffect(() => {
    usersApi.getUserRoles().then((r) => setRoles(Array.isArray(r) ? r : [])).catch(() => {})
  }, [])

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
    const partyAUsers = users.filter((u) => u.role === ROLES.PARTY_A)
    let complete = 0
    let incomplete = 0
    for (const u of partyAUsers) {
      const meta = profileByUserId[u.id]
      if (meta?.profile_complete) complete++
      else incomplete++
    }
    return { total: partyAUsers.length, complete, incomplete }
  }, [users, profileByUserId])

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

      {partyAStats.total > 0 && (
        <p className="text-sm text-slate-600">
          Party A profiles:{' '}
          <span className="font-semibold text-green-700">{partyAStats.complete} complete</span>
          {' · '}
          <span className="font-semibold text-amber-700">{partyAStats.incomplete} incomplete</span>
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
        >
          <option value="">All roles</option>
          {roles.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, email, organization…"
          className="min-w-[220px] flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner size="lg" />
          </div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center text-slate-500">No users match your filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[960px] w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold">Sector</th>
                  <th className="px-4 py-3 font-semibold">Organization</th>
                  <th className="px-4 py-3 font-semibold">Party A Profile</th>
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
                    <td className="px-4 py-3 text-slate-600">{u.sector || '—'}</td>
                    <td className="max-w-[140px] truncate px-4 py-3 text-slate-600">
                      {u.organization || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <PartyAProfileStatusBadge user={u} profileMeta={profileByUserId[u.id]} />
                    </td>
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
  )
}
