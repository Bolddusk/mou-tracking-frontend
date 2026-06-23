import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Alert from '../../components/Alert'
import LoadingSpinner from '../../components/LoadingSpinner'
import { getErrorMessage } from '../../utils/format'

export default function ChangePassword() {
  const { changePassword, user, mustChangePassword, dashboardPath, logout } = useAuth()
  const navigate = useNavigate()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match')
      return
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters')
      return
    }

    setLoading(true)
    try {
      const path = await changePassword(currentPassword, newPassword)
      setSuccess('Password updated successfully — redirecting to your dashboard…')
      setTimeout(() => navigate(path), 800)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <h2 className="mb-1 text-2xl font-bold text-slate-800">Change password</h2>
      {mustChangePassword ? (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          You signed in with a temporary password sent by email. Please set a new password to
          continue.
        </div>
      ) : (
        <p className="mb-6 text-sm text-slate-500">
          Signed in as <strong>{user?.email}</strong>
        </p>
      )}

      <Alert type="error" message={error} onClose={() => setError('')} />
      <Alert type="success" message={success} onClose={() => setSuccess('')} />

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field
          label="Current password"
          id="current"
          type="password"
          value={currentPassword}
          onChange={setCurrentPassword}
          required
        />
        <Field
          label="New password"
          id="new"
          type="password"
          value={newPassword}
          onChange={setNewPassword}
          required
          minLength={6}
        />
        <Field
          label="Confirm new password"
          id="confirm"
          type="password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          required
          minLength={6}
        />
        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-portal-primary py-2.5 text-sm font-semibold text-white hover:bg-portal-primary-hover disabled:opacity-60"
        >
          {loading && <LoadingSpinner size="sm" />}
          Update password
        </button>
      </form>

      {!mustChangePassword && (
        <button
          type="button"
          onClick={() => navigate(dashboardPath)}
          className="mt-4 w-full text-center text-sm font-medium text-green-600 hover:underline"
        >
          ← Back to dashboard
        </button>
      )}

      {mustChangePassword && (
        <button
          type="button"
          onClick={logout}
          className="mt-4 w-full text-center text-sm text-slate-500 hover:text-slate-700"
        >
          Sign out
        </button>
      )}
    </>
  )
}

function Field({ label, id, type, value, onChange, required, minLength }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        minLength={minLength}
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-portal-primary focus:ring-2 focus:ring-portal-primary/30"
      />
    </div>
  )
}
