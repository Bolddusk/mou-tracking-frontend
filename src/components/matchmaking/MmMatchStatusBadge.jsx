import { MM_MATCH_STATUS_LABELS, MM_MATCH_STATUS_STYLES } from '../../constants/matchmaking'

export default function MmMatchStatusBadge({ status }) {
  const key = (status || 'created').toLowerCase()
  const style = MM_MATCH_STATUS_STYLES[key] || 'bg-slate-100 text-slate-700 border-slate-200'
  const label = MM_MATCH_STATUS_LABELS[key] || status || 'Unknown'

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${style}`}>
      {label}
    </span>
  )
}
