import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AdminOversightHeader from '../../components/admin/AdminOversightHeader'
import * as mmApi from '../../api/matchmaking'
import * as proposalsApi from '../../api/proposals'
import Alert from '../../components/Alert'
import LoadingSpinner from '../../components/LoadingSpinner'
import MmProposalStatusBadge from '../../components/matchmaking/MmProposalStatusBadge'
import {
  MmProposalReviewActionButtons,
  MmProposalReviewModal,
} from '../../components/matchmaking/MmProposalReviewActions'
import ProposalSearchInput from '../../components/proposals/ProposalSearchInput'
import { useAuth } from '../../context/AuthContext'
import { useMmProposalReviewActions } from '../../hooks/useMmProposalReviewActions'
import {
  MM_PROPOSAL_STATUS_FILTERS,
  filterMmProposalsBySearch,
} from '../../constants/matchmaking'
import { formatDate, getErrorMessage } from '../../utils/format'
import * as mmDraft from '../../utils/mmProposalDraft'

export default function MmMyProposalsDashboard({ adminOversight = false }) {
  const navigate = useNavigate()
  const { isInvestor } = useAuth()
  const [statusFilter, setStatusFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [proposals, setProposals] = useState([])
  const [engagements, setEngagements] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = statusFilter ? { status: statusFilter } : {}
      const data = adminOversight
        ? await mmApi.getFocalPointMmProposals(params)
        : await mmApi.getMyMmProposals(params)
      setProposals(adminOversight ? data : data.proposals || [])

      if (!adminOversight && isInvestor) {
        try {
          const linked = await proposalsApi.getMyProposals()
          setEngagements(Array.isArray(linked) ? linked : [])
        } catch {
          setEngagements([])
        }
      } else {
        setEngagements([])
      }
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [statusFilter, adminOversight, isInvestor])

  const review = useMmProposalReviewActions({
    onReload: load,
    onStatusFilterChange: adminOversight ? setStatusFilter : undefined,
  })

  useEffect(() => {
    load()
  }, [load])

  const visible = useMemo(
    () => filterMmProposalsBySearch(proposals, searchQuery),
    [proposals, searchQuery],
  )

  const resolveProposalViewPath = (p) => {
    if (p.status === 'matched' && p.engagement_proposal_id) {
      return `/proposals/${p.engagement_proposal_id}`
    }
    return adminOversight ? `/matchmaking/admin/${p.id}` : `/matchmaking/${p.id}`
  }

  const resolveProposalViewLabel = (p) =>
    p.status === 'matched' && p.engagement_proposal_id ? 'Engagement' : 'View'

  return (
    <div className="space-y-6">
      {adminOversight ? (
        <AdminOversightHeader
          title="All Proposals"
          activeTab="myProposals"
          subtitle="Matchmaking proposals across all sectors and countries"
        />
      ) : (
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">My Proposals</h3>
          <p className="text-sm text-slate-500">Matchmaking proposals you own or created on behalf</p>
        </div>
        <Link
          to="/matchmaking/new"
          onClick={() => mmDraft.clearFormState()}
          className="inline-flex justify-center rounded-lg bg-portal-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-portal-primary-hover"
        >
          Add New Proposal
        </Link>
      </div>
      )}

      <Alert type="error" message={error || review.reviewError} onClose={() => { setError(''); review.setReviewError('') }} />
      {adminOversight && (
        <Alert type="success" message={review.success} onClose={() => review.setSuccess('')} />
      )}

      {!adminOversight && isInvestor && engagements.length > 0 && (
        <div className="rounded-xl border border-green-200 bg-green-50/60 p-4 shadow-sm">
          <h4 className="text-sm font-semibold text-green-900">Matchmaking Engagements (Party B)</h4>
          <p className="mt-1 text-sm text-green-800">
            After a match is created, open the engagement to view MOU, chat, and acknowledgments.
          </p>
          <ul className="mt-3 space-y-2">
            {engagements.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => navigate(`/proposals/${e.id}?tab=mou`)}
                  className="text-sm font-semibold text-green-800 hover:underline"
                >
                  {e.venture_name || e.proposal_title || `Engagement #${e.id}`}
                </button>
                <span className="ml-2 text-xs text-green-700">({e.status})</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <ProposalSearchInput value={searchQuery} onChange={setSearchQuery} />
          <div className="flex flex-wrap gap-2">
            {MM_PROPOSAL_STATUS_FILTERS.map((tab) => (
              <button
                key={tab.key || 'all'}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                  statusFilter === tab.key
                    ? 'bg-portal-primary text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
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
          <div className="py-16 text-center text-slate-500">No proposals found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[800px] w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Country</th>
                  <th className="px-4 py-3 font-semibold">Sector</th>
                  <th className="px-4 py-3 font-semibold">Title</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 text-slate-600">{p.country || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{p.sector || '—'}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{p.title || '—'}</td>
                    <td className="px-4 py-3">
                      <MmProposalStatusBadge status={p.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatDate(p.submitted_at || p.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      {adminOversight ? (
                        <MmProposalReviewActionButtons
                          proposal={p}
                          viewLabel={resolveProposalViewLabel(p)}
                          onView={() => navigate(resolveProposalViewPath(p))}
                          onShortlist={review.openShortlist}
                          onReject={review.openReject}
                          onForward={review.openForwardModal}
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => navigate(resolveProposalViewPath(p))}
                          className="text-xs font-semibold text-green-800 hover:underline"
                        >
                          {resolveProposalViewLabel(p)}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {adminOversight && (
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
      )}
    </div>
  )
}
