import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import * as proposalsApi from '../../api/proposals'
import Alert from '../../components/Alert'
import {
  ActionGroup,
  ApproveIcon,
  EditIcon,
  IconButton,
  RejectIcon,
  ViewIcon,
} from '../../components/ActionIcons'
import FilePreviewModal from '../../components/FilePreviewModal'
import Modal from '../../components/Modal'
import PartyBCredentialsModal from '../../components/PartyBCredentialsModal'
import StatCard from '../../components/StatCard'
import ProposalOpportunitiesFilterBar from '../../components/proposals/ProposalOpportunitiesFilterBar'
import ProposalOpportunitiesTable from '../../components/proposals/ProposalOpportunitiesTable'
import ProposalOpportunitiesToolbar from '../../components/proposals/ProposalOpportunitiesToolbar'
import {
  buildProposalListParams,
  getProposalListEmptyMessage,
  PROPOSAL_STATUS_FILTERS,
} from '../../constants/proposalFilters'
import { getProposalDisplayTitle } from '../../constants/proposalTemplate'
import { getErrorMessage } from '../../utils/format'
import { loadDraftFromProposal } from '../../utils/proposalDraft'

const EMPTY_ADVANCED_FILTERS = {
  sector: '',
  mouStatus: '',
  hasMou: '',
  hasPitch: '',
  dealClosed: '',
  dateFrom: '',
  dateTo: '',
}

export default function SuperAdminDashboard() {
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [advancedFilters, setAdvancedFilters] = useState(EMPTY_ADVANCED_FILTERS)
  const [filterOptions, setFilterOptions] = useState(null)
  const [proposals, setProposals] = useState([])
  const [statsProposals, setStatsProposals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [filePreview, setFilePreview] = useState(null)
  const [actionProposal, setActionProposal] = useState(null)
  const [actionType, setActionType] = useState(null)
  const [comment, setComment] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [partyBCredentials, setPartyBCredentials] = useState(null)
  const [partyBCredentialsSubtitle, setPartyBCredentialsSubtitle] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setSearchQuery(searchInput), 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    let cancelled = false
    proposalsApi
      .getProposalFilterOptions()
      .then((data) => {
        if (!cancelled) setFilterOptions(data)
      })
      .catch(() => {
        if (!cancelled) setFilterOptions({ sectors: [], proposal_statuses: [], mou_statuses: [] })
      })
    return () => {
      cancelled = true
    }
  }, [])

  const listParams = useMemo(
    () =>
      buildProposalListParams({
        status: statusFilter,
        sector: advancedFilters.sector,
        mou_status: advancedFilters.mouStatus,
        q: searchQuery,
        date_from: advancedFilters.dateFrom,
        date_to: advancedFilters.dateTo,
        has_mou: advancedFilters.hasMou,
        has_pitch: advancedFilters.hasPitch,
        deal_closed: advancedFilters.dealClosed,
      }),
    [statusFilter, searchQuery, advancedFilters],
  )

  const loadStats = useCallback(async () => {
    try {
      const data = await proposalsApi.getAllProposals()
      setStatsProposals(Array.isArray(data) ? data : [])
    } catch {
      setStatsProposals([])
    }
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await proposalsApi.getAllProposals(listParams)
      setProposals(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(getErrorMessage(err))
      setProposals([])
    } finally {
      setLoading(false)
    }
  }, [listParams])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  useEffect(() => {
    load()
  }, [load])

  const stats = useMemo(() => {
    const counts = { total: statsProposals.length, draft: 0, submitted: 0, approved: 0, rejected: 0 }
    for (const p of statsProposals) {
      const s = (p.status || '').toLowerCase()
      if (s in counts) counts[s]++
    }
    return counts
  }, [statsProposals])

  const hasActiveAdvancedFilters = useMemo(
    () => Object.values(advancedFilters).some(Boolean),
    [advancedFilters],
  )

  const hasActiveFilters = hasActiveAdvancedFilters || Boolean(searchQuery.trim())

  const emptyMessage = getProposalListEmptyMessage({
    totalCount: proposals.length,
    statusFilter,
    searchQuery,
    statusFilters: PROPOSAL_STATUS_FILTERS.superAdmin,
    defaultMessage: hasActiveFilters
      ? 'No opportunities match the current filters.'
      : 'No opportunities found.',
  })

  const clearAllFilters = () => {
    setSearchInput('')
    setSearchQuery('')
    setStatusFilter('')
    setAdvancedFilters(EMPTY_ADVANCED_FILTERS)
  }

  const openFile = (url, title) => setFilePreview({ url, title })

  const handleView = (id) => navigate(`/proposals/${id}`)

  const handleEditMous = async (proposal) => {
    setError('')
    try {
      const full = await proposalsApi.getProposalById(proposal.id)
      loadDraftFromProposal(full)
      navigate(`/proposals/new?edit=${proposal.id}&step=11`)
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const openApprove = (p) => {
    setActionProposal(p)
    setActionType('approve')
    setComment('')
  }

  const openReject = (p) => {
    setActionProposal(p)
    setActionType('reject')
    setComment('')
  }

  const closeAction = () => {
    setActionProposal(null)
    setActionType(null)
    setComment('')
  }

  const handleConfirmAction = async () => {
    if (!actionProposal) return
    if (actionType === 'reject' && !comment.trim()) {
      setError('Rejection comment is required')
      return
    }
    setActionLoading(true)
    setError('')
    setSuccess('')
    try {
      if (actionType === 'approve') {
        const res = await proposalsApi.approveProposal(actionProposal.id, comment.trim())
        setSuccess(res.message || `Opportunity #${actionProposal.id} approved`)
        if (res.party_b?.credentials) {
          setPartyBCredentials(res.party_b.credentials)
          setPartyBCredentialsSubtitle(
            res.party_b.email_sent
              ? 'Credentials are also included here for your records.'
              : 'Email was not sent — copy credentials below and share with Party B.',
          )
        }
      } else {
        await proposalsApi.rejectProposal(actionProposal.id, comment.trim())
        setSuccess(`Opportunity #${actionProposal.id} rejected`)
      }
      closeAction()
      await Promise.all([load(), loadStats()])
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setActionLoading(false)
    }
  }

  const setAdvanced = (key, value) => {
    setAdvancedFilters((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-green-700/20 bg-gradient-to-r from-green-800 to-green-700 p-5 text-white">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-green-100 ring-1 ring-white/25">
            Super Admin
          </span>
          <p className="text-xs font-semibold uppercase tracking-widest text-green-100/90">
            Direct Opportunities
          </p>
        </div>
        <h3 className="mt-2 text-lg font-semibold">All Opportunities</h3>
        <p className="mt-1 text-sm text-green-50/90">
          Legacy proposals across all sectors — approve, reject, and monitor. To create a new MOUS,
          use <strong>Add MOUS</strong> on the <strong>MOUS</strong> page in the sidebar.
        </p>
      </div>

      <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-4 text-sm text-green-900">
        <p className="font-semibold">Matchmaking create (on behalf)</p>
        <p className="mt-1">
          <Link to="/matchmaking/new" className="font-semibold text-portal-primary hover:underline">
            New Proposal
          </Link>{' '}
          — select owner on first save. Lists:{' '}
          <Link to="/matchmaking/admin/my-proposals" className="font-semibold text-portal-primary hover:underline">
            All proposals
          </Link>
          ,{' '}
          <Link to="/matchmaking/admin/focal-point" className="font-semibold text-portal-primary hover:underline">
            Review queue
          </Link>
          . Direct MOUS with Party B:{' '}
          <Link to="/proposals/new" className="font-semibold text-portal-primary hover:underline">
            MOUS → Add MOUS
          </Link>
          .
        </p>
      </div>

      <Alert type="error" message={error} onClose={() => setError('')} />
      <Alert type="success" message={success} onClose={() => setSuccess('')} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard color="teal" label="Total" value={stats.total} icon={<span>Σ</span>} />
        <StatCard color="yellow" label="Draft" value={stats.draft} icon={<span>✎</span>} />
        <StatCard color="blue" label="Submitted" value={stats.submitted} icon={<span>⏳</span>} />
        <StatCard color="green" label="Approved" value={stats.approved} icon={<span>✓</span>} />
        <StatCard color="red" label="Rejected" value={stats.rejected} icon={<span>✕</span>} />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <ProposalOpportunitiesToolbar
          title="Direct Opportunities"
          search={searchInput}
          onSearchChange={setSearchInput}
          statusFilters={PROPOSAL_STATUS_FILTERS.superAdmin}
          statusValue={statusFilter}
          onStatusChange={setStatusFilter}
        />

        <ProposalOpportunitiesFilterBar
          sector={advancedFilters.sector}
          onSectorChange={(v) => setAdvanced('sector', v)}
          mouStatus={advancedFilters.mouStatus}
          onMouStatusChange={(v) => setAdvanced('mouStatus', v)}
          hasMou={advancedFilters.hasMou}
          onHasMouChange={(v) => setAdvanced('hasMou', v)}
          hasPitch={advancedFilters.hasPitch}
          onHasPitchChange={(v) => setAdvanced('hasPitch', v)}
          dealClosed={advancedFilters.dealClosed}
          onDealClosedChange={(v) => setAdvanced('dealClosed', v)}
          dateFrom={advancedFilters.dateFrom}
          onDateFromChange={(v) => setAdvanced('dateFrom', v)}
          dateTo={advancedFilters.dateTo}
          onDateToChange={(v) => setAdvanced('dateTo', v)}
          sectors={filterOptions?.sectors || []}
          mouStatuses={filterOptions?.mou_statuses || []}
          onClearAll={clearAllFilters}
          hasActiveFilters={hasActiveFilters || Boolean(statusFilter)}
        />

        <ProposalOpportunitiesTable
          proposals={proposals}
          loading={loading}
          emptyMessage={emptyMessage}
          onView={handleView}
          onOpenFile={openFile}
          renderActions={(p) => (
            <ActionGroup>
              <IconButton variant="view" title="View details" onClick={() => handleView(p.id)}>
                <ViewIcon />
              </IconButton>
              {p.status === 'draft' && (
                <IconButton
                  variant="edit"
                  title="Edit MOUS — Party A steps + MOU detail (Step 11)"
                  onClick={() => handleEditMous(p)}
                >
                  <EditIcon />
                </IconButton>
              )}
              {(p.status === 'submitted' || p.status === 'resubmitted') && (
                          <>
                            <IconButton variant="approve" title="Approve" onClick={() => openApprove(p)}>
                              <ApproveIcon />
                            </IconButton>
                            <IconButton variant="reject" title="Reject" onClick={() => openReject(p)}>
                              <RejectIcon />
                            </IconButton>
                          </>
                        )}
            </ActionGroup>
          )}
        />
      </div>

      <FilePreviewModal
        open={Boolean(filePreview)}
        title={filePreview?.title}
        fileUrl={filePreview?.url}
        onClose={() => setFilePreview(null)}
      />

      <Modal
        open={Boolean(actionProposal)}
        title={actionType === 'approve' ? 'Approve Opportunity' : 'Reject Opportunity'}
        onClose={closeAction}
        onConfirm={handleConfirmAction}
        confirmLabel={actionType === 'approve' ? 'Approve' : 'Reject'}
        confirmVariant={actionType === 'reject' ? 'danger' : 'primary'}
        loading={actionLoading}
        confirmDisabled={actionType === 'reject' && !comment.trim()}
      >
        <p className="mb-3 text-sm text-slate-600">
          <strong>{getProposalDisplayTitle(actionProposal)}</strong>
          <span className="mt-1 block text-slate-500">Sector: {actionProposal?.sector}</span>
        </p>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          placeholder={
            actionType === 'reject' ? 'Reason for rejection (required)' : 'Optional comment'
          }
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-portal-primary focus:ring-2 focus:ring-portal-primary/30"
        />
      </Modal>

      <PartyBCredentialsModal
        open={Boolean(partyBCredentials)}
        credentials={partyBCredentials}
        subtitle={partyBCredentialsSubtitle}
        onClose={() => {
          setPartyBCredentials(null)
          setPartyBCredentialsSubtitle('')
        }}
      />
    </div>
  )
}
