import { useEffect, useMemo, useState } from 'react'
import * as usersApi from '../../api/users'
import Alert from '../Alert'
import LoadingSpinner from '../LoadingSpinner'
import { getErrorMessage } from '../../utils/format'

function userOptionLabel(user) {
  const name = user.full_name || user.email || `User #${user.id}`
  const org = user.organization ? ` · ${user.organization}` : ''
  const email = user.email && user.full_name ? ` (${user.email})` : ''
  return `${name}${email}${org}`
}

export default function OnBehalfOwnerPicker({
  role,
  title,
  description,
  selectedId,
  onSelect,
  onContinue,
  continueLabel = 'Continue to wizard',
}) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const data = await usersApi.listUsers({ role })
        if (!cancelled) setUsers(usersApi.parseUsersList(data))
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [role])

  const selectedUser = useMemo(
    () => users.find((u) => String(u.id) === String(selectedId)),
    [users, selectedId],
  )

  return (
    <div className="mx-auto max-w-lg space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          Super Admin
        </p>
        <h2 className="mt-1 text-xl font-semibold text-slate-800">{title}</h2>
        <p className="mt-2 text-sm text-slate-600">{description}</p>
      </div>

      <Alert type="error" message={error} onClose={() => setError('')} />

      {loading ? (
        <div className="flex justify-center py-10">
          <LoadingSpinner size="lg" />
        </div>
      ) : users.length === 0 ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          No users found for role <strong>{role}</strong>. Add a user under Administration → Users
          first.
        </p>
      ) : (
        <div>
          <label htmlFor="on-behalf-user" className="mb-1 block text-sm font-medium text-slate-700">
            Select account *
          </label>
          <select
            id="on-behalf-user"
            value={selectedId ?? ''}
            onChange={(e) => {
              const id = e.target.value ? Number(e.target.value) : null
              const user = users.find((u) => String(u.id) === String(id))
              onSelect(id, user ? userOptionLabel(user) : '')
            }}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-portal-primary focus:ring-2 focus:ring-portal-primary/30"
          >
            <option value="">Choose…</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {userOptionLabel(u)}
              </option>
            ))}
          </select>
          {selectedUser && (
            <p className="mt-2 text-xs text-slate-500">
              Proposal will be owned by this account. Required on the first save only.
            </p>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={onContinue}
        disabled={!selectedId || loading}
        className="w-full rounded-lg bg-portal-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-portal-primary-hover disabled:opacity-50"
      >
        {continueLabel}
      </button>
    </div>
  )
}
