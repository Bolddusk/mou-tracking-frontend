import { Fragment, useState } from 'react'
import ProposalExportMenu from './ProposalExportMenu'
import StatusBadge from '../StatusBadge'
import { ROLE_LABELS } from '../../constants/sectors'
import { formatDate } from '../../utils/format'

function InfoBlock({ title, children }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
      <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">{title}</h4>
      {children}
    </div>
  )
}

function FieldGrid({ items }) {
  return (
    <dl className="grid gap-2 sm:grid-cols-2">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt className="text-xs font-medium text-slate-500">{label}</dt>
          <dd className="mt-0.5 text-sm text-slate-800">{value || '—'}</dd>
        </div>
      ))}
    </dl>
  )
}

function formatComments(comments) {
  if (!comments?.length) return '—'
  return comments
    .map((c) => {
      const role = ROLE_LABELS[c.author_role] || c.author_role
      const when = c.created_at ? formatDate(c.created_at) : ''
      return `${c.author_name} (${role})${when ? ` [${when}]` : ''}: ${c.text}`
    })
    .join('\n')
}

function formatApprovals(approvals) {
  if (!approvals?.length) return '—'
  return approvals
    .map((a) => {
      const role = ROLE_LABELS[a.action_by_role] || a.action_by_role
      const when = a.actioned_at ? formatDate(a.actioned_at) : ''
      const comment = a.comment ? ` — ${a.comment}` : ''
      return `${a.action_by_name} (${role}) ${a.action}${when ? ` [${when}]` : ''}${comment}`
    })
    .join('\n')
}

export default function ProposalExportReportModal({ open, report, onClose, onExportError }) {
  const [expandedId, setExpandedId] = useState(null)

  if (!open || !report) return null

  const { proposal, parties, value, overview, updates, summary } = report

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-label="Close report preview"
      />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">Export Report Preview</h3>
            <p className="mt-1 text-sm text-slate-500">
              {proposal?.title || proposal?.venture_name} · #{proposal?.id}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ProposalExportMenu proposalId={proposal?.id} onError={onExportError} />
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Close
            </button>
          </div>
        </div>

        <div className="space-y-5 overflow-y-auto px-6 py-5">
          {summary && (
            <div className="flex flex-wrap gap-3 text-sm">
              <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
                {summary.total_activities} activities
              </span>
              <span className="rounded-full bg-emerald-50 px-3 py-1 font-medium text-emerald-800">
                {summary.approved_activities} approved
              </span>
              <span className="rounded-full bg-amber-50 px-3 py-1 font-medium text-amber-800">
                {summary.pending_activities} pending
              </span>
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <InfoBlock title="Party A">
              <FieldGrid
                items={[
                  ['Name', parties?.party_a?.name],
                  ['Organization', parties?.party_a?.organization],
                  ['Email', parties?.party_a?.email],
                  ['Phone', parties?.party_a?.phone],
                  ['Country', parties?.party_a?.country],
                  ['City', parties?.party_a?.city],
                ]}
              />
            </InfoBlock>
            <InfoBlock title="Party B">
              <FieldGrid
                items={[
                  ['Name', parties?.party_b?.name],
                  ['Organization', parties?.party_b?.organization],
                  ['Email', parties?.party_b?.email],
                  ['Phone', parties?.party_b?.phone],
                  ['Country', parties?.party_b?.country],
                ]}
              />
            </InfoBlock>
          </div>

          <InfoBlock title="Investment Value">
            <FieldGrid
              items={[
                ['Total project cost (USD)', value?.total_project_cost_usd],
                ['Equity ask (USD)', value?.investment_ask_equity_usd],
                ['Debt ask (USD)', value?.investment_ask_debt_usd],
                ['Total funds required (PKR Mn)', value?.total_funds_required_pkr_mn],
                ['Raising from investors (PKR Mn)', value?.raising_from_investors_pkr_mn],
                ['Projected IRR (%)', value?.projected_irr_pct],
                ['Payback (years)', value?.payback_period_years],
                ['Investment ask summary', value?.investment_ask_summary],
              ]}
            />
          </InfoBlock>

          <InfoBlock title="Overview">
            <FieldGrid
              items={[
                ['Venture', overview?.venture_name],
                ['Company', overview?.company_name],
                ['Project type', overview?.project_type],
                ['Conference', overview?.conference_name],
                ['MOU scope', overview?.mou_scope],
              ]}
            />
            {overview?.executive_summary?.company_overview && (
              <p className="mt-3 text-sm text-slate-600">
                <span className="font-medium text-slate-700">Executive summary: </span>
                {overview.executive_summary.company_overview}
              </p>
            )}
          </InfoBlock>

          <div>
            <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">
              Activity Updates
            </h4>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-[800px] w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Date</th>
                    <th className="px-3 py-2 font-semibold">Title</th>
                    <th className="px-3 py-2 font-semibold">Status</th>
                    <th className="px-3 py-2 font-semibold">Added by</th>
                    <th className="px-3 py-2 font-semibold">Comments</th>
                    <th className="px-3 py-2 font-semibold" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(updates || []).map((u) => (
                    <Fragment key={u.id}>
                      <tr className="hover:bg-slate-50/80">
                        <td className="whitespace-nowrap px-3 py-2 text-slate-600">
                          {formatDate(u.activity_date)}
                        </td>
                        <td className="max-w-[160px] truncate px-3 py-2 font-medium text-slate-800">
                          {u.title}
                        </td>
                        <td className="px-3 py-2">
                          <StatusBadge status={u.status} />
                        </td>
                        <td className="px-3 py-2 text-slate-600">
                          {u.added_by_name}
                          <span className="block text-xs text-slate-400">
                            {ROLE_LABELS[u.added_by_role] || u.added_by_role}
                          </span>
                        </td>
                        <td className="max-w-[200px] truncate px-3 py-2 text-xs text-slate-500">
                          {u.comments?.length ? `${u.comments.length} comment(s)` : '—'}
                        </td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => setExpandedId((prev) => (prev === u.id ? null : u.id))}
                            className="text-xs font-semibold text-green-700 hover:underline"
                          >
                            {expandedId === u.id ? 'Hide' : 'Details'}
                          </button>
                        </td>
                      </tr>
                      {expandedId === u.id && (
                        <tr className="bg-slate-50/60">
                          <td colSpan={6} className="px-4 py-3 text-sm text-slate-600">
                            {u.description && (
                              <p className="mb-2">
                                <span className="font-medium text-slate-700">Description: </span>
                                {u.description}
                              </p>
                            )}
                            <p className="mb-1 whitespace-pre-wrap text-xs">
                              <span className="font-medium text-slate-700">Comments: </span>
                              {formatComments(u.comments)}
                            </p>
                            <p className="mb-1 whitespace-pre-wrap text-xs">
                              <span className="font-medium text-slate-700">Approvals: </span>
                              {formatApprovals(u.approvals)}
                            </p>
                            {u.poke_response && (
                              <p className="text-xs">
                                <span className="font-medium text-slate-700">Update response: </span>
                                {u.poke_response.title}
                              </p>
                            )}
                            {u.support_file_url && (
                              <p className="mt-1 text-xs text-green-700">{u.support_file_url}</p>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
              {(!updates || updates.length === 0) && (
                <p className="px-4 py-6 text-center text-sm text-slate-500">No activities in report.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
