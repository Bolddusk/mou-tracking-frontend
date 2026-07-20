import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import * as proposalsApi from '../../api/proposals'
import Alert from '../../components/Alert'
import ProposalOpportunitiesFilterBar from '../../components/proposals/ProposalOpportunitiesFilterBar'
import ProposalOpportunitiesPagination from '../../components/proposals/ProposalOpportunitiesPagination'
import ProposalOpportunitiesTable from '../../components/proposals/ProposalOpportunitiesTable'
import ProposalConferenceMouTable from '../../components/proposals/ProposalConferenceMouTable'
import MouChangeLogsPanel from '../../components/proposals/MouChangeLogsPanel'
import OpportunitiesDashboardTabs from '../../components/proposals/OpportunitiesDashboardTabs'
import ProposalOpportunitiesToolbar from '../../components/proposals/ProposalOpportunitiesToolbar'
import {
  buildCooperationModeFilters,
  buildDashboardListTabFilters,
  buildSectorLeadListParams,
  dashboardTabFiltersToPills,
  DEFAULT_MOU_LIFECYCLE_STATUSES,
  getListTabQuery,
  getMouLifecycleCounts,
  getProposalListEmptyMessage,
} from '../../constants/proposalFilters'
import {
  ActionGroup,
  ApproveIcon,
  DeleteIcon,
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
import {
  conferenceShowsHistoricMouColumnsByKey,
  getOpportunitiesDashboardHeader,
  normalizeMouLifecycleStatuses,
} from '../../utils/mouConferenceFields'
import { reportFiltersFromListParams } from '../../utils/conferenceReportQuery'
import {
  formatScopedSectorsDetail,
  getScopedSectors,
} from '../../utils/scopedSectors'
import {
  getExistingAccountNotices,
  shouldShowCredentialsModal,
} from '../../utils/partyContactProvision'

const DEFAULT_PAGE_LIMIT = 20

const EMPTY_ADVANCED_FILTERS = {
  mouLifecycle: '',
  sifcCategory: '',
  dateFrom: '',
  dateTo: '',
}

export default function SectorLeadDashboard() {
  const navigate = useNavigate()
  const { user, rbac } = useAuth()
  const profilePaths = getPartyAProfilePaths(user?.role)

  const [listTabFilter, setListTabFilter] = useState('all')
  const [cooperationModeFilter, setCooperationModeFilter] = useState('')
  const [conferenceFilter, setConferenceFilter] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(DEFAULT_PAGE_LIMIT)
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [advancedFilters, setAdvancedFilters] = useState(EMPTY_ADVANCED_FILTERS)
  const [filterOptions, setFilterOptions] = useState(null)
  const [proposals, setProposals] = useState([])
  const [pagination, setPagination] = useState(null)
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
  const [dashboardView, setDashboardView] = useState('opportunities')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

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
        if (!cancelled) {
          setFilterOptions({
            sectors: user?.assigned_sectors?.length
              ? user.assigned_sectors
              : user?.sector
                ? [user.sector]
                : [],
            scoped_sector: user?.primary_sector || user?.sector || null,
            scoped_sectors:
              user?.assigned_sectors?.length
                ? user.assigned_sectors
                : user?.sector
                  ? [user.sector]
                  : [],
            proposal_statuses: [],
            mou_lifecycle_statuses: DEFAULT_MOU_LIFECYCLE_STATUSES,
            cooperation_modes: [],
            conferences: [],
            sifc_categories: [],
          })
        }
      })
    return () => {
      cancelled = true
    }
  }, [user?.sector, user?.assigned_sectors, user?.primary_sector])

  const refreshFilterOptions = useCallback(async () => {
    try {
      const data = await proposalsApi.getProposalFilterOptions()
      setFilterOptions(data)
    } catch {
      /* keep existing options */
    }
  }, [])

  const cooperationModeFilters = useMemo(
    () => buildCooperationModeFilters(filterOptions?.cooperation_modes),
    [filterOptions?.cooperation_modes],
  )

  const scopedSectors = useMemo(
    () => getScopedSectors({ rbac, user, filterOptions }),
    [rbac, user, filterOptions],
  )

  const scopedSectorLabel = formatScopedSectorsDetail(scopedSectors)

  const selectedConference = useMemo(
    () => (filterOptions?.conferences || []).find((c) => c.key === conferenceFilter) || null,
    [filterOptions?.conferences, conferenceFilter],
  )

  const mouLifecycleStatuses = useMemo(
    () =>
      normalizeMouLifecycleStatuses(filterOptions?.mou_lifecycle_statuses) ||
      DEFAULT_MOU_LIFECYCLE_STATUSES,
    [filterOptions?.mou_lifecycle_statuses],
  )

  const dashboardTabFilters = useMemo(
    () => buildDashboardListTabFilters(filterOptions),
    [filterOptions],
  )

  const lifecycleCounts = useMemo(
    () => getMouLifecycleCounts(filterOptions),
    [filterOptions],
  )

  const toolbarTabFilters = useMemo(
    () => dashboardTabFiltersToPills(dashboardTabFilters),
    [dashboardTabFilters],
  )

  const dashboardHeader = useMemo(
    () =>
      getOpportunitiesDashboardHeader({
        selectedConference,
        listScope: 'sector',
        pageTitle: 'Sector Review Queue',
        scopedSector: scopedSectorLabel,
      }),
    [selectedConference, scopedSectorLabel],
  )

  const showConferenceTable = conferenceShowsHistoricMouColumnsByKey(
    conferenceFilter,
    filterOptions?.conferences,
  )

  const listToolbarTitle = selectedConference ? dashboardHeader.title : 'Direct Opportunities'

  const listParams = useMemo(
    () =>
      buildSectorLeadListParams({
        ...getListTabQuery(listTabFilter, dashboardTabFilters),
        cooperation_mode: cooperationModeFilter,
        conference_key: conferenceFilter,
        sifc_category: advancedFilters.sifcCategory,
        q: searchQuery,
        date_from: advancedFilters.dateFrom,
        date_to: advancedFilters.dateTo,
        page,
        limit,
      }),
    [listTabFilter, dashboardTabFilters, searchQuery, advancedFilters, cooperationModeFilter, conferenceFilter, page, limit],
  )

  const reportFilters = useMemo(
    () => reportFiltersFromListParams(listParams),
    [listParams],
  )

  useEffect(() => {
    setPage(1)
  }, [listTabFilter, cooperationModeFilter, conferenceFilter, searchQuery, advancedFilters])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await proposalsApi.getOpportunitiesListPaginated(listParams, rbac)
      setProposals(result.data)
      setPagination(result.pagination)
    } catch (err) {
      setError(getErrorMessage(err))
      setProposals([])
      setPagination(null)
    } finally {
      setLoading(false)
    }
  }, [listParams, rbac])

  useEffect(() => {
    load()
  }, [load])

  const stats = lifecycleCounts

  const hasActiveAdvancedFilters = useMemo(
    () => Object.values(advancedFilters).some(Boolean),
    [advancedFilters],
  )

  const hasActiveFilters =
    hasActiveAdvancedFilters ||
    Boolean(searchQuery.trim()) ||
    Boolean(cooperationModeFilter) ||
    Boolean(conferenceFilter)

  const emptyMessage = getProposalListEmptyMessage({
    totalCount: pagination?.total ?? proposals.length,
    listTabFilter,
    searchQuery,
    tabFilters: dashboardTabFilters,
    defaultMessage: hasActiveFilters
      ? 'No opportunities match the current filters.'
      : 'No opportunities in this queue.',
  })

  const clearAllFilters = () => {
    setSearchInput('')
    setSearchQuery('')
    setListTabFilter('all')
    setCooperationModeFilter('')
    setConferenceFilter('')
    setPage(1)
    setLimit(DEFAULT_PAGE_LIMIT)
    setAdvancedFilters(EMPTY_ADVANCED_FILTERS)
  }

  const openFile = (url, title) => setFilePreview({ url, title })

  const handleView = (id) => navigate(`/proposals/${id}`)

  const handleDeleteProposal = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    setError('')
    setSuccess('')
    try {
      const res = await proposalsApi.deleteProposal(deleteTarget.id)
      setSuccess(res?.message || `Proposal #${deleteTarget.id} deleted`)
      setDeleteTarget(null)
      await Promise.all([load(), refreshFilterOptions()])
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setDeleteLoading(false)
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
        const existingNotices = getExistingAccountNotices(res.party_a, res.party_b)
        setSuccess(
          [res.message || `Opportunity #${actionProposal.id} approved`, ...existingNotices]
            .filter(Boolean)
            .join(' · '),
        )
        if (shouldShowCredentialsModal(res.party_b)) {
          setPartyBCredentials(res.party_b.credentials)
          setPartyBCredentialsSubtitle(
            res.party_b.email_sent
              ? 'Party B account created — credentials were also emailed.'
              : 'Party B account created — share login credentials with Party B.',
          )
        }
      } else {
        await proposalsApi.rejectProposal(actionProposal.id, comment.trim())
        setSuccess(`Opportunity #${actionProposal.id} rejected`)
      }
      closeAction()
      await Promise.all([load(), refreshFilterOptions()])
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setActionLoading(false)
    }
  }

  const setAdvanced = (key, value) => {
    setAdvancedFilters((prev) => ({ ...prev, [key]: value }))
  }

  const renderTableActions = (p) => (
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
      {p.capabilities?.can_delete === true && (
        <IconButton
          variant="delete"
          title={p.status === 'rejected' ? 'Delete rejected proposal' : 'Delete draft'}
          onClick={() => setDeleteTarget(p)}
        >
          <DeleteIcon />
        </IconButton>
      )}
    </ActionGroup>
  )

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-green-700/20 bg-gradient-to-r from-green-800 to-green-700 p-5 text-white">
        <div className="flex flex-wrap items-center gap-2">
          {dashboardHeader.badge && (
            <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-green-100 ring-1 ring-white/25">
              {dashboardHeader.badge}
            </span>
          )}
          {dashboardHeader.eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-widest text-green-100/90">
              {dashboardHeader.eyebrow}
            </p>
          )}
        </div>
        <h3 className="mt-2 text-lg font-semibold">{dashboardHeader.title}</h3>
        <p className="mt-1 text-sm text-green-50/90">{dashboardHeader.description}</p>
      </div>

      {dashboardHeader.showMatchmakingLinks && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-4 text-sm text-green-900">
          <p className="font-semibold">Matchmaking review</p>
          <p className="mt-1">
            <Link to="/matchmaking/forwarded" className="font-semibold text-portal-primary hover:underline">
              Forwarded to me
            </Link>
            ,{' '}
            <Link to="/matchmaking/board" className="font-semibold text-portal-primary hover:underline">
              Matching board
            </Link>
            ,{' '}
            <Link to="/matchmaking/matches" className="font-semibold text-portal-primary hover:underline">
              Matches
            </Link>
            .
          </p>
        </div>
      )}

      <Alert type="error" message={error} onClose={() => setError('')} />
      <Alert type="success" message={success} onClose={() => setSuccess('')} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard color="teal" label="Total" value={stats.all ?? 0} icon={<span>Σ</span>} />
        <StatCard color="green" label="Active" value={stats.active ?? 0} icon={<span>✓</span>} />
        <StatCard color="yellow" label="Inactive" value={stats.inactive ?? 0} icon={<span>○</span>} />
        <StatCard color="blue" label="Execution" value={stats.execution ?? 0} icon={<span>⏳</span>} />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <OpportunitiesDashboardTabs active={dashboardView} onChange={setDashboardView} />

        {dashboardView === 'change-logs' ? (
          <MouChangeLogsPanel />
        ) : (
          <>
        <ProposalOpportunitiesToolbar
          title={listToolbarTitle}
          search={searchInput}
          onSearchChange={setSearchInput}
          statusFilters={toolbarTabFilters}
          statusValue={listTabFilter}
          onStatusChange={setListTabFilter}
        />

        <ProposalOpportunitiesFilterBar
          conferenceKey={conferenceFilter}
          onConferenceChange={setConferenceFilter}
          conferences={filterOptions?.conferences || []}
          selectedConference={selectedConference}
          mouLifecycle={advancedFilters.mouLifecycle}
          onMouLifecycleChange={(v) => setAdvanced('mouLifecycle', v)}
          sifcCategory={advancedFilters.sifcCategory}
          onSifcCategoryChange={(v) => setAdvanced('sifcCategory', v)}
          sifcCategories={filterOptions?.sifc_categories || []}
          cooperationMode={cooperationModeFilter}
          onCooperationModeChange={setCooperationModeFilter}
          cooperationModeFilters={cooperationModeFilters}
          dateFrom={advancedFilters.dateFrom}
          onDateFromChange={(v) => setAdvanced('dateFrom', v)}
          dateTo={advancedFilters.dateTo}
          onDateToChange={(v) => setAdvanced('dateTo', v)}
          mouLifecycleStatuses={mouLifecycleStatuses}
          hideSectorFilter
          hideMouLifecycleFilter
          onClearAll={clearAllFilters}
          hasActiveFilters={hasActiveFilters || listTabFilter !== 'all'}
          reportFilters={reportFilters}
          onReportError={setError}
        />

        {showConferenceTable ? (
          <ProposalConferenceMouTable
            proposals={proposals}
            loading={loading}
            emptyMessage={emptyMessage}
            onView={handleView}
            renderActions={renderTableActions}
          />
        ) : (
          <ProposalOpportunitiesTable
            proposals={proposals}
            loading={loading}
            emptyMessage={emptyMessage}
            showCooperationMode
            showMouLifecycle
            showDocumentLinks={false}
            showWorkflowStatus={false}
            useConferenceDate
            showSifcCategory
            onView={handleView}
            onOpenFile={openFile}
            renderActions={renderTableActions}
          />
        )}

        <ProposalOpportunitiesPagination
          pagination={pagination}
          limit={limit}
          onLimitChange={(newLimit) => {
            setPage(1)
            setLimit(newLimit)
          }}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => p + 1)}
          loading={loading}
        />
          </>
        )}
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

      <Modal
        open={Boolean(deleteTarget)}
        title="Delete proposal?"
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteProposal}
        confirmLabel="Delete"
        confirmVariant="danger"
        loading={deleteLoading}
      >
        <p className="text-sm text-slate-600">
          Permanently delete{' '}
          <strong>{getProposalDisplayTitle(deleteTarget)}</strong>
          {deleteTarget?.status === 'rejected' ? ' (rejected)' : ' (draft)'}? This cannot be undone.
        </p>
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
