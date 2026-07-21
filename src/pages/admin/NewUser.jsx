import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import * as ministriesApi from '../../api/ministries'
import * as usersApi from '../../api/users'
import Alert from '../../components/Alert'
import LoadingSpinner from '../../components/LoadingSpinner'
import { useSectors } from '../../context/SectorsContext'
import { getErrorMessage } from '../../utils/format'

const EMPTY_FORM = {
  full_name: '',
  email: '',
  password: '',
  role: 'party_a',
  sector: '',
  organization: '',
  phone: '',
  ministry_id: '',
}

export default function NewUser() {
  const { sectors } = useSectors()
  const navigate = useNavigate()
  const [roles, setRoles] = useState([])
  const [ministries, setMinistries] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)

  useEffect(() => {
    Promise.all([
      usersApi.getUserRoles(),
      ministriesApi.listMinistries().catch(() => ({ data: [] })),
    ])
      .then(([r, ministryRes]) => {
        const list = usersApi.parseAssignableUserRoles(r)
        setRoles(list)
        const mins = ministryRes?.data || []
        setMinistries(mins)
        setForm((f) => {
          let next = { ...f }
          if (list.length && !list.some((role) => role.value === f.role)) {
            next.role = list[0].value
          }
          if (!f.ministry_id && mins[0]?.id) {
            next.ministry_id = String(mins[0].id)
          }
          return next
        })
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (form.role === 'sector_lead' && !form.sector && sectors[0]) {
      setForm((f) => ({ ...f, sector: sectors[0] }))
    }
  }, [form.role, form.sector, sectors])

  const selectedRole = useMemo(
    () => roles.find((r) => r.value === form.role),
    [roles, form.role]
  )

  const needsSector = selectedRole?.requires_sector
  const needsMinistry = usersApi.MINISTRY_SCOPED_USER_ROLES.has(form.role)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.full_name.trim() || !form.email.trim() || !form.password.trim()) return
    if (needsSector && !form.sector.trim()) return
    if (needsMinistry && !form.ministry_id) return

    setSubmitting(true)
    setError('')
    try {
      const created = await usersApi.createUser({
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
        sector: needsSector ? form.sector.trim() : undefined,
        organization: form.organization.trim() || undefined,
        phone: form.phone.trim() || undefined,
        ministry_id: needsMinistry ? Number(form.ministry_id) : undefined,
      })
      navigate(`/admin/users/${created.id}`)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link to="/admin/users" className="text-sm font-medium text-green-600 hover:underline">
          ← Back to users
        </Link>
        <h3 className="mt-2 text-lg font-semibold text-slate-800">Add User</h3>
      </div>

      <Alert type="error" message={error} onClose={() => setError('')} />

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <Field label="Full Name" required>
          <input
            type="text"
            value={form.full_name}
            onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            required
          />
        </Field>

        <Field label="Email" required>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            required
          />
        </Field>

        <Field label="Password" required>
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            minLength={6}
            placeholder="Min 6 characters"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            required
          />
        </Field>

        <Field label="Role" required>
          <select
            value={form.role}
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            {roles.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </Field>

        {needsMinistry && (
          <Field label="Ministry" required>
            <select
              value={form.ministry_id}
              onChange={(e) => setForm((f) => ({ ...f, ministry_id: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              required
            >
              <option value="">Select ministry</option>
              {ministries.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </Field>
        )}

        {needsSector && (
          <Field label="Sector" required>
            <select
              value={form.sector}
              onChange={(e) => setForm((f) => ({ ...f, sector: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              required
            >
              {sectors.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
        )}

        <Field label="Organization">
          <input
            type="text"
            value={form.organization}
            onChange={(e) => setForm((f) => ({ ...f, organization: e.target.value }))}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </Field>

        <Field label="Phone">
          <input
            type="text"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </Field>

        <div className="flex justify-end gap-3 pt-2">
          <Link
            to="/admin/users"
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-lg bg-portal-primary px-4 py-2 text-sm font-semibold text-white hover:bg-portal-primary-hover disabled:opacity-50"
          >
            {submitting && <LoadingSpinner size="sm" />}
            Create User
          </button>
        </div>
      </form>
    </div>
  )
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      {children}
    </div>
  )
}
