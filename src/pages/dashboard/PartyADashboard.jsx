import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import * as profileApi from '../../api/profile'
import * as proposalsApi from '../../api/proposals'
import Alert from '../../components/Alert'
import ProposalOpportunitiesTable from '../../components/proposals/ProposalOpportunitiesTable'
import ProposalOpportunitiesToolbar from '../../components/proposals/ProposalOpportunitiesToolbar'
import {
  filterProposals,
  getProposalListEmptyMessage,
  PROPOSAL_STATUS_FILTERS,
} from '../../constants/proposalFilters'
import PartyASubmissionPaths from '../../components/party-a/PartyASubmissionPaths'
import PartyACrudActions from '../../components/PartyACrudActions'
import FilePreviewModal from '../../components/FilePreviewModal'
import Modal from '../../components/Modal'
import StatCard from '../../components/StatCard'
import { getProposalDisplayTitle } from '../../constants/proposalTemplate'
import { getErrorMessage } from '../../utils/format'
import { clearFormState, loadDraftFromProposal } from '../../utils/proposalDraft'

function ProfileCompletionBanner({ summary }) {
  if (!summary) return null

  const { pct, complete, missing, companyName } = summary
  const missingCount = missing.length

  if (pct === 100 && complete) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 sm:px-5 sm:py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-green-800">Profile complete ✓</span>
            {companyName && (
              <span className="text-sm text-green-700">— {companyName}</span>
            )}
          </div>
          <span className="text-xs font-medium text-green-700">100%</span>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 sm:px-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-amber-900">
              Profile {pct}% complete
            </p>
            {companyName && (
              <span className="text-sm text-amber-800">— {companyName}</span>
            )}
          </div>
          <p className="mt-1 text-sm text-amber-800">
            Complete your company profile and upload FBR + SECP documents.
            {missingCount > 0 && (
              <span className="font-medium">
                {' '}
                {missingCount} item{missingCount === 1 ? '' : 's'} remaining.
              </span>
            )}
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-amber-100">
            <div
              className="h-full rounded-full bg-portal-primary transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
            />
          </div>
        </div>
        <Link
          to="/dashboard/party-a/profile"
          className="inline-flex shrink-0 items-center justify-center rounded-lg bg-portal-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-portal-primary-hover"
        >
          Complete Profile →
        </Link>
      </div>
    </div>
  )
}

export default function PartyADashboard() {
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [proposals, setProposals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filePreview, setFilePreview] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [profileSummary, setProfileSummary] = useState(null)

  useEffect(() => {
    profileApi
      .getProfile()
      .then((data) => {
        setProfileSummary({
          pct: data.completion?.completion_pct ?? 0,
          complete: data.completion?.profile_complete ?? false,
          missing: data.completion?.missing_fields ?? [],
          companyName: data.profile?.company_name || null,
        })
      })
      .catch(() => {})
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await proposalsApi.getMyProposals()
      setProposals(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filteredProposals = useMemo(
    () => filterProposals(proposals, { status: statusFilter, search: searchQuery }),
    [proposals, statusFilter, searchQuery],
  )

  const stats = useMemo(() => {
    const counts = {
      total: proposals.length,
      draft: 0,
      submitted: 0,
      resubmitted: 0,
      approved: 0,
      rejected: 0,
    }
    for (const p of proposals) {
      const s = (p.status || '').toLowerCase()
      if (s in counts) counts[s]++
    }
    return counts
  }, [proposals])

  const filterEmptyMessage = getProposalListEmptyMessage({
    totalCount: proposals.length,
    statusFilter,
    searchQuery,
    statusFilters: PROPOSAL_STATUS_FILTERS.partyA,
    defaultMessage: 'No opportunities yet.',
  })

  const openFile = (url, title) => setFilePreview({ url, title })

  const handleNewOpportunity = () => {
    clearFormState()
    navigate('/proposals/new')
  }

  const handleContinueDraft = (proposal) => {
    loadDraftFromProposal(proposal)
    navigate('/proposals/new')
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    setError('')
    try {
      await proposalsApi.deleteProposal(deleteTarget.id)
      setDeleteTarget(null)
      await load()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <ProfileCompletionBanner summary={profileSummary} />

      <PartyASubmissionPaths onDirectMous={() => navigate('/proposals/new')} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">Direct MOUS — My Opportunities</h3>
          <p className="text-sm text-slate-500">
            Conference / direct submissions with Party B and MOU already in place
          </p>
        </div>
        <button
          type="button"
          onClick={handleNewOpportunity}
          className="inline-flex items-center justify-center rounded-lg bg-portal-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-portal-primary-hover"
          title="Chinese partner + MOU ready — government review"
        >
          Add MOUS
        </button>
      </div>

      <Alert type="error" message={error} onClose={() => setError('')} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard color="teal" label="Total" value={stats.total} footer="All" icon={<span>Σ</span>} />
        <StatCard color="yellow" label="Drafts" value={stats.draft} icon={<span>✎</span>} />
        <StatCard color="blue" label="Submitted" value={stats.submitted} icon={<span>⏳</span>} />
        <StatCard color="green" label="Approved" value={stats.approved} icon={<span>✓</span>} />
        <StatCard color="red" label="Rejected" value={stats.rejected} icon={<span>✕</span>} />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <ProposalOpportunitiesToolbar
          search={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilters={PROPOSAL_STATUS_FILTERS.partyA}
          statusValue={statusFilter}
          onStatusChange={setStatusFilter}
        />

        {!loading && proposals.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-slate-500">No opportunities yet.</p>
            <button
              type="button"
              onClick={handleNewOpportunity}
              className="mt-2 text-sm font-medium text-green-600 hover:underline"
            >
              Add your first opportunity
            </button>
          </div>
        ) : (
          <ProposalOpportunitiesTable
            proposals={filteredProposals}
            loading={loading}
            emptyMessage={filterEmptyMessage}
            showTitle
            onView={(id) => navigate(`/proposals/${id}`)}
            onOpenFile={openFile}
            rowClassName={(p) =>
              p.poke_status?.status === 'pending_response'
                ? 'bg-amber-50/60 hover:bg-amber-50'
                : ''
            }
            renderUpdateExtra={(p) =>
              p.poke_status?.status === 'pending_response' ? (
                <button
                  type="button"
                  onClick={() =>
                    navigate(`/proposals/${p.id}?tab=updates`, {
                      state: {
                        respondToPoke: true,
                        pokeActivityId: p.poke_status?.poke_activity_id,
                      },
                    })
                  }
                  className="text-left text-xs font-semibold text-amber-700 hover:text-amber-900 hover:underline"
                >
                  Respond →
                </button>
              ) : null
            }
            renderActions={(p) => (
              <PartyACrudActions
                proposal={p}
                onView={(item) => navigate(`/proposals/${item.id}`)}
                onUpdate={handleContinueDraft}
                onDelete={setDeleteTarget}
              />
            )}
          />
        )}
      </div>

      <FilePreviewModal
        open={Boolean(filePreview)}
        title={filePreview?.title}
        fileUrl={filePreview?.url}
        onClose={() => setFilePreview(null)}
      />

      <Modal
        open={Boolean(deleteTarget)}
        title="Delete opportunity?"
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        confirmLabel="Delete"
        confirmVariant="danger"
        loading={deleteLoading}
      >
        <p className="text-sm text-slate-600">
          Permanently delete <strong>{getProposalDisplayTitle(deleteTarget)}</strong>? This cannot be undone.
        </p>
      </Modal>
    </div>
  )
}
