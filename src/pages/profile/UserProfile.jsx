import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as authApi from '../../api/auth'
import Alert from '../../components/Alert'
import LoadingSpinner from '../../components/LoadingSpinner'
import { useAuth } from '../../context/AuthContext'
import { ROLE_LABELS } from '../../constants/sectors'
import { getErrorMessage } from '../../utils/format'

const EMPTY_FORM = {
  full_name: '',
  email: '',
  organization: '',
  phone: '',
}

function userToForm(user) {
  if (!user) return { ...EMPTY_FORM }
  return {
    full_name: user.full_name || '',
    email: user.email || '',
    organization: user.organization || '',
    phone: user.phone || '',
  }
}

export default function UserProfile() {
  const { user, updateProfile, isPartyA, dashboardPath } = useAuth()
  const [form, setForm] = useState(EMPTY_FORM)
  const [readOnly, setReadOnly] = useState({ role: '', sector: '', country: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await authApi.getMe()
      const profile = data.user || data
      setForm(userToForm(profile))
      setReadOnly({
        role: profile.role || '',
        sector: profile.sector || '',
        country: profile.country || '',
      })
    } catch (err) {
      setError(getErrorMessage(err))
      setForm(userToForm(user))
      setReadOnly({
        role: user?.role || '',
        sector: user?.sector || '',
        country: user?.country || '',
      })
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  const handleChange = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const payload = {
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        organization: form.organization.trim() || undefined,
        phone: form.phone.trim() || undefined,
      }
      const data = await updateProfile(payload)
      setForm(userToForm(data.user))
      const emailChanged = data.token ? ' A new session was started because your email changed.' : ''
      setSuccess((data.message || 'Profile updated.') + emailChanged)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
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
    <div className="mx-auto w-full max-w-2xl space-y-5">
      <div>
        <h3 className="text-lg font-semibold text-slate-800">My Profile</h3>
        <p className="text-sm text-slate-500">
          Update your account name, email, organization, and phone.
        </p>
      </div>

      <Alert type="error" message={error} onClose={() => setError('')} />
      <Alert type="success" message={success} onClose={() => setSuccess('')} />

      {isPartyA && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
          For company certificates, sectors, and compliance filings, open{' '}
          <Link
            to="/dashboard/party-a/profile"
            className="font-semibold text-green-800 underline hover:text-green-950"
          >
            Company Profile
          </Link>
          .
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h4 className="mb-4 text-base font-semibold text-slate-800">Account Details</h4>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full Name" required className="sm:col-span-2">
              <input
                type="text"
                value={form.full_name}
                onChange={handleChange('full_name')}
                required
                className={inputClass}
              />
            </Field>
            <Field label="Email" required className="sm:col-span-2">
              <input
                type="email"
                value={form.email}
                onChange={handleChange('email')}
                required
                className={inputClass}
              />
            </Field>
            <Field label="Organization">
              <input
                type="text"
                value={form.organization}
                onChange={handleChange('organization')}
                className={inputClass}
              />
            </Field>
            <Field label="Phone">
              <input
                type="tel"
                value={form.phone}
                onChange={handleChange('phone')}
                className={inputClass}
              />
            </Field>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <h4 className="mb-1 text-sm font-semibold text-slate-700">Managed by admin</h4>
          <p className="mb-4 text-xs text-slate-500">
            Role, sector, and country can only be changed by a Super Admin.
          </p>
          <dl className="grid gap-3 sm:grid-cols-3">
            <ReadOnlyField
              label="Role"
              value={ROLE_LABELS[readOnly.role] || readOnly.role || '—'}
            />
            <ReadOnlyField label="Sector" value={readOnly.sector || '—'} />
            <ReadOnlyField label="Country" value={readOnly.country || '—'} />
          </dl>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            to={dashboardPath}
            className="text-sm font-medium text-slate-600 hover:text-slate-800 hover:underline"
          >
            ← Back to dashboard
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-portal-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-portal-primary-hover disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}

const inputClass =
  'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-portal-primary focus:ring-2 focus:ring-portal-primary/30'

function Field({ label, required, className = '', children }) {
  return (
    <div className={className}>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      {children}
    </div>
  )
}

function ReadOnlyField({ label, value }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-slate-800">{value}</dd>
    </div>
  )
}
