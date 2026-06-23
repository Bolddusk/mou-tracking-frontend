import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import * as proposalsApi from '../../api/proposals'
import Alert from '../../components/Alert'
import ProposalOpportunitiesTable from '../../components/proposals/ProposalOpportunitiesTable'
import ProposalOpportunitiesToolbar from '../../components/proposals/ProposalOpportunitiesToolbar'
import {
  filterProposalsBySearch,
  getProposalListEmptyMessage,
  PROPOSAL_STATUS_FILTERS,
} from '../../constants/proposalFilters'
import {
  ActionGroup,
  ApproveIcon,
  IconButton,
  RejectIcon,
  ViewIcon,
} from '../../components/ActionIcons'
import FilePreviewModal from '../../components/FilePreviewModal'
import Modal from '../../components/Modal'
import PartyBCredentialsModal from '../../components/PartyBCredentialsModal'
import StatCard from '../../components/StatCard'
import { getPartyAProfilePaths } from '../../constants/profileRoutes'
import { getProposalDisplayTitle } from '../../constants/proposalTemplate'
import { getErrorMessage } from '../../utils/format'

export default function SectorLeadDashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const profilePaths = getPartyAProfilePaths(user?.role)
  const [statusFilter, setStatusFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [proposals, setProposals] = useState([])
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

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await proposalsApi.getSectorLeadProposals(statusFilter || undefined)
      setProposals(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    load()
  }, [load])

  const visibleProposals = useMemo(
    () => filterProposalsBySearch(proposals, searchQuery),
    [proposals, searchQuery],
  )

  const stats = useMemo(() => {
    const counts = {
      total: proposals.length,
      submitted: 0,
      resubmitted: 0,
      approved: 0,
      completed: 0,
      rejected: 0,
    }
    for (const p of proposals) {
      const s = (p.status || '').toLowerCase()
      if (s in counts) counts[s]++
    }
    return counts
  }, [proposals])

  const emptyMessage = getProposalListEmptyMessage({
    totalCount: proposals.length,
    statusFilter,
    searchQuery,
    statusFilters: PROPOSAL_STATUS_FILTERS.sectorLead,
    defaultMessage: 'No opportunities in this queue.',
  })

  const openFile = (url, title) => setFilePreview({ url, title })

  const handleView = (id) => navigate(`/proposals/${id}`)

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
      await load()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-800">Sector Review Queue</h3>
        <p className="text-sm text-slate-500">
          Your sector: <strong>{user?.sector || '—'}</strong>
        </p>
      </div>

      <Alert type="error" message={error} onClose={() => setError('')} />
      <Alert type="success" message={success} onClose={() => setSuccess('')} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard color="teal" label="In view" value={stats.total} icon={<span>Σ</span>} />
        <StatCard color="yellow" label="Pending" value={stats.submitted} icon={<span>⏳</span>} />
        <StatCard color="green" label="Approved" value={stats.approved} icon={<span>✓</span>} />
        <StatCard color="red" label="Rejected" value={stats.rejected} icon={<span>✕</span>} />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <ProposalOpportunitiesToolbar
          search={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilters={PROPOSAL_STATUS_FILTERS.sectorLead}
          statusValue={statusFilter}
          onStatusChange={setStatusFilter}
        />

        <ProposalOpportunitiesTable
          proposals={visibleProposals}
          loading={loading}
          emptyMessage={emptyMessage}
          onView={handleView}
          onOpenFile={openFile}
          renderStatusExtra={(p) =>
            p.status === 'resubmitted' && (p.resubmit_count ?? 0) > 1 ? (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 ring-1 ring-amber-200">
                ×{p.resubmit_count}
              </span>
            ) : null
          }
          renderActions={(p) => (
            <ActionGroup>
              <IconButton variant="view" title="View details" onClick={() => handleView(p.id)}>
                <ViewIcon />
              </IconButton>
              {p.party_a_id && (
                <button
                  type="button"
                  title="View Party A Profile"
                  onClick={() => navigate(profilePaths.detail(p.party_a_id))}
                  className="rounded-lg border border-green-200 px-2 py-1 text-[11px] font-semibold text-green-800 hover:bg-green-50"
                >
                  Profile
                </button>
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
