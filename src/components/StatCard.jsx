export default function StatCard({ icon, label, value, footer, color = 'green' }) {
  const iconBg = {
    teal: 'bg-green-600',
    green: 'bg-green-600',
    orange: 'bg-orange-500',
    red: 'bg-red-500',
    blue: 'bg-blue-500',
    yellow: 'bg-yellow-500',
  }[color]

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <div className="flex items-center gap-4">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white ${iconBg}`}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <p className="truncate text-2xl font-bold text-slate-800">{value}</p>
        </div>
      </div>
      {footer && (
        <p className="mt-3 border-t border-slate-100 pt-2 text-xs text-slate-400">
          {footer}
        </p>
      )}
    </div>
  )
}
