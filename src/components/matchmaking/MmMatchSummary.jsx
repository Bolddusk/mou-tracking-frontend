import MmMatchStatusBadge from './MmMatchStatusBadge'
import { formatDate } from '../../utils/format'

export default function MmMatchSummary({ match, showMeta = false }) {
  if (!match) return null

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          {showMeta && (
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              Match #{match.id}
            </p>
          )}
          <p className="mt-1 text-sm text-slate-600">
            Sector: <strong>{match.sector || '—'}</strong>
          </p>
          {match.submitted_for_review_at && (
            <p className="mt-1 text-xs text-slate-500">
              Submitted for review {formatDate(match.submitted_for_review_at)}
            </p>
          )}
          {match.proposed_by_name && (
            <p className="mt-1 text-xs text-slate-500">Proposed by {match.proposed_by_name}</p>
          )}
        </div>
        <MmMatchStatusBadge status={match.status} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-green-200 bg-green-50/50 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-green-800">Pakistan</p>
          <dl className="mt-3 space-y-2 text-sm">
            <div>
              <dt className="text-xs font-medium text-slate-500">Venture</dt>
              <dd className="font-medium text-slate-800">{match.pk_venture_name || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Party A</dt>
              <dd className="text-slate-700">{match.party_a_name || '—'}</dd>
            </div>
          </dl>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50/50 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-red-800">China</p>
          <dl className="mt-3 space-y-2 text-sm">
            <div>
              <dt className="text-xs font-medium text-slate-500">Venture</dt>
              <dd className="font-medium text-slate-800">{match.cn_venture_name || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Chinese contact</dt>
              <dd className="text-slate-700">{match.cn_party_b_name || '—'}</dd>
            </div>
            {match.cn_party_b_email && (
              <div>
                <dt className="text-xs font-medium text-slate-500">Email</dt>
                <dd className="text-slate-600">{match.cn_party_b_email}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>
    </div>
  )
}
