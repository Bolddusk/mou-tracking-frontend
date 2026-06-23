import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Alert from '../../components/Alert'
import LoadingSpinner from '../../components/LoadingSpinner'
import { PORTAL_SHORT } from '../../constants/branding'
import { getErrorMessage } from '../../utils/format'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const path = await login(email, password)
      navigate(path)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <h2 className="mb-1 text-2xl font-bold text-slate-800">Sign in</h2>
      <p className="mb-6 text-sm text-slate-500">{PORTAL_SHORT} — all roles</p>
      <div className="mb-4 rounded-lg border border-green-100 bg-green-50 px-3 py-2 text-xs text-slate-600">
        <p className="font-medium text-slate-600">Test logins (password: password123)</p>
        <ul className="mt-1 space-y-0.5">
          <li><strong>partya@test.com</strong> — Party A</li>
          <li><strong>sectorlead@test.com</strong> — Sector Lead (Agri-chemicals & Inputs)</li>
          <li><strong>superadmin@test.com</strong> — Super Admin</li>
        </ul>
      </div>

      <Alert type="error" message={error} onClose={() => setError('')} />

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Email" id="email" type="email" value={email} onChange={setEmail} required />
        <Field
          label="Password"
          id="password"
          type="password"
          value={password}
          onChange={setPassword}
          required
          minLength={6}
        />
        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-portal-primary py-2.5 text-sm font-semibold text-white hover:bg-portal-primary-hover disabled:opacity-60"
        >
          {loading && <LoadingSpinner size="sm" />}
          Sign in
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        No account?{' '}
        <Link to="/auth/register" className="font-medium text-portal-primary hover:underline">
          Register
        </Link>
      </p>
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
