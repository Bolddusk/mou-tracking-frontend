const MOU_LIFECYCLE_BADGE_CLASSES = {
  active: 'bg-green-100 text-green-800 ring-green-200',
  inactive: 'bg-slate-100 text-slate-600 ring-slate-200',
  execution: 'bg-blue-100 text-blue-800 ring-blue-200',
}

export default function MouLifecycleBadge({ lifecycle, label }) {
  if (!lifecycle && !label) {
    return <span className="text-slate-400">—</span>
  }

  const colorClass =
    MOU_LIFECYCLE_BADGE_CLASSES[lifecycle] || 'bg-slate-100 text-slate-600 ring-slate-200'

  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${colorClass}`}
    >
      {label || lifecycle}
    </span>
  )
}
