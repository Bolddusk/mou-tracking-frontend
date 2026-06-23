const STATUS_STYLES = {
  draft: 'bg-slate-100 text-slate-700 border-slate-200',
  submitted: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  resubmitted: 'bg-amber-100 text-amber-800 border-amber-200',
  approved: 'bg-green-100 text-green-800 border-green-200',
  completed: 'bg-slate-200 text-slate-800 border-slate-300',
  rejected: 'bg-red-100 text-red-800 border-red-200',
}

const STATUS_LABELS = {
  resubmitted: 'Resubmitted',
  completed: 'Completed',
}

export default function StatusBadge({ status }) {
  const key = (status || 'draft').toLowerCase()
  const style = STATUS_STYLES[key] || 'bg-slate-100 text-slate-700 border-slate-200'

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${style}`}
    >
      {STATUS_LABELS[key] || status || 'unknown'}
    </span>
  )
}
