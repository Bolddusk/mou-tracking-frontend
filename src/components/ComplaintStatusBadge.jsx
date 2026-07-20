const STATUS_STYLES = {
  open: 'bg-blue-100 text-blue-800 border-blue-200',
  under_review: 'bg-amber-100 text-amber-800 border-amber-200',
  escalated: 'bg-violet-100 text-violet-900 border-violet-200',
  resolved: 'bg-green-100 text-green-800 border-green-200',
  rejected: 'bg-red-100 text-red-800 border-red-200',
  forwarded: 'bg-purple-100 text-purple-800 border-purple-200',
  returned_to_sector_lead: 'bg-orange-100 text-orange-800 border-orange-200',
}

const STATUS_LABELS = {
  open: 'Open',
  under_review: 'Under Review',
  escalated: 'Escalated',
  resolved: 'Resolved',
  rejected: 'Rejected',
  forwarded: 'Forwarded',
  returned_to_sector_lead: 'Returned to Sector Lead',
}

export default function ComplaintStatusBadge({ status }) {
  const key = (status || 'open').toLowerCase()
  const style = STATUS_STYLES[key] || STATUS_STYLES.open
  const label = STATUS_LABELS[key] || status || 'Open'

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${style}`}
    >
      {label}
    </span>
  )
}
