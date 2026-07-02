export default function OperationalStatusBadge({ status }) {
  if (!status || status === '—') {
    return <span className="text-slate-400">—</span>
  }

  const normalized = String(status).trim().toLowerCase()
  let className = 'bg-amber-50 text-amber-800 ring-amber-200'

  if (normalized === 'active') {
    className = 'bg-green-100 text-green-800 ring-green-200'
  } else if (normalized === 'inactive') {
    className = 'bg-slate-100 text-slate-600 ring-slate-200'
  } else if (normalized === 'in execution' || normalized === 'execution') {
    className = 'bg-blue-100 text-blue-800 ring-blue-200'
  }

  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${className}`}>
      {status}
    </span>
  )
}
