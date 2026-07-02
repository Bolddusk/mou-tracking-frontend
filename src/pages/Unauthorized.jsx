import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Unauthorized() {
  const { dashboardPath } = useAuth()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-portal-bg px-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Access denied</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-800">You don&apos;t have permission</h1>
        <p className="mt-3 text-sm text-slate-600">
          This page requires permissions your role doesn&apos;t have. Contact an administrator if you
          need access.
        </p>
        <Link
          to={dashboardPath}
          className="mt-6 inline-flex rounded-lg bg-sidebar px-4 py-2.5 text-sm font-medium text-white hover:bg-sidebar-hover"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  )
}
