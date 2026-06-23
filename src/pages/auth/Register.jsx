import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Alert from '../../components/Alert'
import LoadingSpinner from '../../components/LoadingSpinner'
import { getErrorMessage } from '../../utils/format'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    organization: '',
    phone: '',
  })

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const path = await register(form)
      navigate(path)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <h2 className="mb-1 text-2xl font-bold text-slate-800">Party A Registration</h2>
      <p className="mb-6 text-sm text-slate-500">Create your account to submit investment opportunities</p>

      <Alert type="error" message={error} onClose={() => setError('')} />

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Full name" value={form.full_name} onChange={set('full_name')} required />
        <Field label="Email" type="email" value={form.email} onChange={set('email')} required />
        <Field
          label="Password (min 6)"
          type="password"
          value={form.password}
          onChange={set('password')}
          required
          minLength={6}
        />
        <Field label="Organization" value={form.organization} onChange={set('organization')} required />
        <Field label="Phone" value={form.phone} onChange={set('phone')} required />
        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-portal-primary py-2.5 text-sm font-semibold text-white hover:bg-portal-primary-hover disabled:opacity-60"
        >
          {loading && <LoadingSpinner size="sm" />}
          Register
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Already have an account?{' '}
        <Link to="/auth/login" className="font-medium text-green-600 hover:underline">
          Sign in
        </Link>
      </p>
    </>
  )
}

function Field({ label, type = 'text', value, onChange, required, minLength }) {
  const id = label.toLowerCase().replace(/\s/g, '-')
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        minLength={minLength}
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-portal-primary focus:ring-2 focus:ring-portal-primary/30"
      />
    </div>
  )
}
