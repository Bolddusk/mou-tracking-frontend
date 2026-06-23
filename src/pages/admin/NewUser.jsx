import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import * as usersApi from '../../api/users'
import Alert from '../../components/Alert'
import LoadingSpinner from '../../components/LoadingSpinner'
import { SECTORS } from '../../constants/sectors'
import { getErrorMessage } from '../../utils/format'

const EMPTY_FORM = {
  full_name: '',
  email: '',
  password: '',
  role: 'party_a',
  sector: SECTORS[0],
  organization: '',
  phone: '',
}

export default function NewUser() {
  const navigate = useNavigate()
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)

  useEffect(() => {
    usersApi
      .getUserRoles()
      .then((r) => setRoles(Array.isArray(r) ? r : []))
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }, [])

  const selectedRole = useMemo(
    () => roles.find((r) => r.value === form.role),
    [roles, form.role]
  )

  const needsSector = selectedRole?.requires_sector

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.full_name.trim() || !form.email.trim() || !form.password.trim()) return
    if (needsSector && !form.sector.trim()) return

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

        {needsSector && (
          <Field
            label={form.role === 'sector_lead' ? 'Sector' : 'Region / Sector'}
            required
          >
            {form.role === 'sector_lead' ? (
              <select
                value={form.sector}
                onChange={(e) => setForm((f) => ({ ...f, sector: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                required
              >
                {SECTORS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={form.sector}
                onChange={(e) => setForm((f) => ({ ...f, sector: e.target.value }))}
                placeholder="e.g. Punjab Region"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                required
              />
            )}
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
