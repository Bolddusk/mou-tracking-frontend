import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminOversightHeader from '../../components/admin/AdminOversightHeader'
import * as mmApi from '../../api/matchmaking'
import Alert from '../../components/Alert'
import LoadingSpinner from '../../components/LoadingSpinner'
import MmProposalStatusBadge from '../../components/matchmaking/MmProposalStatusBadge'
import {
  MmProposalReviewActionButtons,
  MmProposalReviewModal,
} from '../../components/matchmaking/MmProposalReviewActions'
import ProposalSearchInput from '../../components/proposals/ProposalSearchInput'
import { MM_PROPOSAL_STATUS_FILTERS, filterMmProposalsBySearch } from '../../constants/matchmaking'
import { useMmProposalReviewActions } from '../../hooks/useMmProposalReviewActions'
import { getErrorMessage } from '../../utils/format'

export default function MmFocalPointDashboard({ adminOversight = false }) {
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useState('submitted')
  const [searchQuery, setSearchQuery] = useState('')
  const [proposals, setProposals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = statusFilter ? { status: statusFilter } : {}
      const data = await mmApi.getFocalPointMmProposals(params)
      setProposals(data)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  const review = useMmProposalReviewActions({
    onReload: load,
    onStatusFilterChange: setStatusFilter,
  })

  useEffect(() => {
    load()
  }, [load])

  const visible = useMemo(
    () => filterMmProposalsBySearch(proposals, searchQuery),
    [proposals, searchQuery],
  )

  const proposalViewPath = (id) =>
    adminOversight ? `/matchmaking/admin/${id}` : `/matchmaking/${id}`

  return (
    <div className="space-y-6">
      {adminOversight && (
        <AdminOversightHeader
          title="Review Queue"
          activeTab="focalPoint"
          subtitle="All sectors — proposals awaiting focal point / sector lead review"
        />
      )}
      {!adminOversight && (
        <div>
          <h3 className="text-lg font-semibold text-slate-800">Review Queue</h3>
          <p className="text-sm text-slate-500">Proposals in your review scope</p>
        </div>
      )}

      <Alert type="error" message={error || review.reviewError} onClose={() => { setError(''); review.setReviewError('') }} />
      <Alert type="success" message={review.success} onClose={() => review.setSuccess('')} />

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <ProposalSearchInput value={searchQuery} onChange={setSearchQuery} />
          <div className="flex flex-wrap gap-2">
            {MM_PROPOSAL_STATUS_FILTERS.filter((f) => f.key !== 'draft').map((tab) => (
              <button
                key={tab.key || 'all'}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                  statusFilter === tab.key
                    ? 'bg-portal-primary text-white'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner size="lg" />
          </div>
        ) : visible.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <p>No proposals in this queue.</p>
            {statusFilter === 'shortlisted' && (
              <p className="mx-auto mt-2 max-w-md text-xs text-slate-400">
                After shortlist, proposals should appear here. If the list is empty after
                shortlisting, check backend{' '}
                <code className="text-slate-500">GET /api/matchmaking/proposals/focal-point?status=shortlisted</code>
                .
              </p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[960px] w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Submitter</th>
                  <th className="px-4 py-3 font-semibold">Country</th>
                  <th className="px-4 py-3 font-semibold">Sector</th>
                  <th className="px-4 py-3 font-semibold">Title</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 text-slate-600">{p.submitter_name || p.submitter_email || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{p.country || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{p.sector || '—'}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{p.title || '—'}</td>
                    <td className="px-4 py-3">
                      <MmProposalStatusBadge status={p.status} />
                    </td>
                    <td className="px-4 py-3">
                      <MmProposalReviewActionButtons
                        proposal={p}
                        onView={() => navigate(proposalViewPath(p.id))}
                        onShortlist={review.openShortlist}
                        onReject={review.openReject}
                        onForward={review.openForwardModal}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <MmProposalReviewModal
        actionTarget={review.actionTarget}
        actionType={review.actionType}
        comment={review.comment}
        onCommentChange={review.setComment}
        forwardTargets={review.forwardTargets}
        forwardToUserId={review.forwardToUserId}
        onForwardToChange={review.setForwardToUserId}
        loadingForwardTargets={review.loadingForwardTargets}
        actionLoading={review.actionLoading}
        onClose={review.closeModal}
        onConfirm={review.handleConfirm}
      />
    </div>
  )
}
