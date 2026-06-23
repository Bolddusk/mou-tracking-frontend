import { MM_PROPOSAL_STATUS_LABELS, MM_PROPOSAL_STATUS_STYLES } from '../../constants/matchmaking'

export default function MmProposalStatusBadge({ status }) {
  const key = (status || 'draft').toLowerCase()
  const style = MM_PROPOSAL_STATUS_STYLES[key] || 'bg-slate-100 text-slate-700 border-slate-200'
  const label = MM_PROPOSAL_STATUS_LABELS[key] || status || 'Unknown'

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${style}`}>
      {label}
    </span>
  )
}
