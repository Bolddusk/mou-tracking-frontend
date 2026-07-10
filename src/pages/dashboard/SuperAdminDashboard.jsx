import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import * as proposalsApi from '../../api/proposals'
import * as activitiesApi from '../../api/activities'
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
import ProposalOpportunitiesPagination from '../../components/proposals/ProposalOpportunitiesPagination'
import ProposalOpportunitiesTable from '../../components/proposals/ProposalOpportunitiesTable'
import ProposalConferenceMouTable from '../../components/proposals/ProposalConferenceMouTable'
import MouChangeLogsPanel from '../../components/proposals/MouChangeLogsPanel'
import OpportunitiesDashboardTabs from '../../components/proposals/OpportunitiesDashboardTabs'
import ProposalOpportunitiesToolbar from '../../components/proposals/ProposalOpportunitiesToolbar'
import {
  buildCooperationModeFilters,
  buildDashboardListTabFilters,
  buildProposalListParams,
  buildSectorLeadListParams,
  dashboardTabFiltersToPills,
  DEFAULT_MOU_LIFECYCLE_STATUSES,
  getListTabQuery,
  getMouLifecycleCounts,
  getProposalListEmptyMessage,
  PROPOSAL_STATUS_FILTERS,
} from '../../constants/proposalFilters'
import { getProposalDisplayTitle } from '../../constants/proposalTemplate'
import { getErrorMessage } from '../../utils/format'
import {
  conferenceShowsHistoricMouColumnsByKey,
  getOpportunitiesDashboardHeader,
  normalizeMouLifecycleStatuses,
} from '../../utils/mouConferenceFields'
import { getOpportunitiesNavLabel, getProposalsListScope } from '../../utils/rbac'
import { loadDraftFromProposal } from '../../utils/proposalDraft'

const DEFAULT_PAGE_LIMIT = 20

const EMPTY_ADVANCED_FILTERS = {
  sector: '',
  mouLifecycle: '',
  sifcCategory: '',
  dateFrom: '',
  dateTo: '',
}

export default function SuperAdminDashboard() {
  const navigate = useNavigate()
  const location = useLocation()
  const { rbac, isSuperAdmin } = useAuth()
  const listScope = useMemo(() => getProposalsListScope(rbac), [rbac])
  const usesLifecycleTabs = listScope !== 'own'
  const pageTitle = useMemo(() => getOpportunitiesNavLabel(rbac), [rbac])
  const [statusFilter, setStatusFilter] = useState('')
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
  const [archiveFilter, setArchiveFilter] = useState('')
  const [dismissAllLoading, setDismissAllLoading] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setSearchQuery(searchInput), 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    if (!location.state?.success) return
    setSuccess(location.state.success)
    navigate(location.pathname + location.search, { replace: true, state: null })
  }, [location.state?.success, location.pathname, location.search, navigate])

  useEffect(() => {
    let cancelled = false
    proposalsApi
      .getProposalFilterOptions()
      .then((data) => {
        if (!cancelled) setFilterOptions(data)
      })
      .catch(() => {
        if (!cancelled) setFilterOptions({ sectors: [], proposal_statuses: [], mou_lifecycle_statuses: DEFAULT_MOU_LIFECYCLE_STATUSES, cooperation_modes: [], conferences: [], sifc_categories: [] })
      })
    return () => {
      cancelled = true
    }
  }, [])

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

  const toolbarTabFilters = useMemo(() => {
    if (usesLifecycleTabs) return dashboardTabFiltersToPills(dashboardTabFilters)
    if (listScope === 'sector') return PROPOSAL_STATUS_FILTERS.sectorLead
    if (listScope === 'own') return PROPOSAL_STATUS_FILTERS.partyA
    return PROPOSAL_STATUS_FILTERS.superAdmin
  }, [usesLifecycleTabs, dashboardTabFilters, listScope])

  const dashboardHeader = useMemo(
    () =>
      getOpportunitiesDashboardHeader({
        selectedConference,
        listScope,
        pageTitle,
        scopedSector: rbac?.context?.scoped_sector || filterOptions?.scoped_sector,
      }),
    [selectedConference, listScope, pageTitle, rbac, filterOptions?.scoped_sector],
  )

  const showConferenceTable = conferenceShowsHistoricMouColumnsByKey(
    conferenceFilter,
    filterOptions?.conferences,
  )

  const listToolbarTitle = selectedConference
    ? dashboardHeader.title
    : pageTitle

  const listParams = useMemo(() => {
    const tabQuery = usesLifecycleTabs
      ? getListTabQuery(listTabFilter, dashboardTabFilters)
      : {}
    const base = buildProposalListParams({
      status: usesLifecycleTabs ? '' : statusFilter,
      sector: advancedFilters.sector,
      mou_lifecycle: usesLifecycleTabs
        ? tabQuery.mou_lifecycle || ''
        : advancedFilters.mouLifecycle,
      cooperation_mode: cooperationModeFilter,
      conference_key: conferenceFilter,
      sifc_category: advancedFilters.sifcCategory,
      q: searchQuery,
      date_from: advancedFilters.dateFrom,
      date_to: advancedFilters.dateTo,
      include_deleted: archiveFilter === 'include_deleted' ? 1 : '',
      archived_only: archiveFilter === 'archived_only' ? 1 : '',
      page,
      limit,
    })
    if (listScope === 'sector') return buildSectorLeadListParams(base)
    if (listScope === 'own') return buildSectorLeadListParams(base)
    return base
  }, [
    usesLifecycleTabs,
    listTabFilter,
    dashboardTabFilters,
    statusFilter,
    searchQuery,
    advancedFilters,
    cooperationModeFilter,
    conferenceFilter,
    page,
    limit,
    listScope,
    archiveFilter,
  ])

  useEffect(() => {
    setPage(1)
  }, [
    usesLifecycleTabs ? listTabFilter : statusFilter,
    cooperationModeFilter,
    conferenceFilter,
    searchQuery,
    advancedFilters,
    archiveFilter,
  ])

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

  const stats = useMemo(() => {
    if (usesLifecycleTabs) return lifecycleCounts
    const counts = { total: pagination?.total ?? 0, draft: 0, submitted: 0, approved: 0, rejected: 0 }
    for (const p of proposals) {
      const s = (p.status || '').toLowerCase()
      if (s in counts) counts[s]++
    }
    counts.total = pagination?.total ?? proposals.length
    return counts
  }, [usesLifecycleTabs, lifecycleCounts, proposals, pagination?.total])

  const hasActiveAdvancedFilters = useMemo(
    () => Object.values(advancedFilters).some(Boolean),
    [advancedFilters],
  )

  const hasActiveFilters =
    hasActiveAdvancedFilters ||
    Boolean(searchQuery.trim()) ||
    Boolean(cooperationModeFilter) ||
    Boolean(conferenceFilter) ||
    Boolean(archiveFilter)

  const emptyMessage = getProposalListEmptyMessage({
    totalCount: pagination?.total ?? proposals.length,
    listTabFilter: usesLifecycleTabs ? listTabFilter : '',
    statusFilter: usesLifecycleTabs ? '' : statusFilter,
    searchQuery,
    tabFilters: dashboardTabFilters,
    statusFilters: toolbarTabFilters,
    defaultMessage: hasActiveFilters
      ? 'No opportunities match the current filters.'
      : 'No opportunities found.',
  })

  const clearAllFilters = () => {
    setSearchInput('')
    setSearchQuery('')
    if (usesLifecycleTabs) setListTabFilter('all')
    else setStatusFilter('')
    setCooperationModeFilter('')
    setConferenceFilter('')
    setPage(1)
    setLimit(DEFAULT_PAGE_LIMIT)
    setAdvancedFilters(EMPTY_ADVANCED_FILTERS)
    setArchiveFilter('')
  }

  const openFile = (url, title) => setFilePreview({ url, title })

  const handleView = (id) => navigate(`/proposals/${id}`)

  const handleDismissAllPendingUpdates = async () => {
    if (
      !window.confirm(
        'Clear all pending update requests waiting for Party A? This does not affect submissions already awaiting review.',
      )
    ) {
      return
    }
    setDismissAllLoading(true)
    setError('')
    try {
      const res = await activitiesApi.dismissAllPendingUpdateRequests()
      setSuccess(
        res?.message ||
          `Cleared ${res?.dismissed_count ?? 0} pending update request(s)`,
      )
      await load()
      await refreshFilterOptions()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setDismissAllLoading(false)
    }
  }

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

      {dashboardHeader.showSuperAdminExtras && (
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
      )}

      <Alert type="error" message={error} onClose={() => setError('')} />
      <Alert type="success" message={success} onClose={() => setSuccess('')} />

      <div className={`grid gap-4 sm:grid-cols-2 ${usesLifecycleTabs ? 'xl:grid-cols-4' : 'xl:grid-cols-5'}`}>
        {usesLifecycleTabs ? (
          <>
            <StatCard color="teal" label="Total" value={stats.all ?? 0} icon={<span>Σ</span>} />
            <StatCard color="green" label="Active" value={stats.active ?? 0} icon={<span>✓</span>} />
            <StatCard color="yellow" label="Inactive" value={stats.inactive ?? 0} icon={<span>○</span>} />
            <StatCard color="blue" label="Execution" value={stats.execution ?? 0} icon={<span>⏳</span>} />
          </>
        ) : (
          <>
            <StatCard color="teal" label="Total" value={stats.total} icon={<span>Σ</span>} />
            <StatCard color="yellow" label="Draft" value={stats.draft} icon={<span>✎</span>} />
            <StatCard color="blue" label="Submitted" value={stats.submitted} icon={<span>⏳</span>} />
            <StatCard color="green" label="Approved" value={stats.approved} icon={<span>✓</span>} />
            <StatCard color="red" label="Rejected" value={stats.rejected} icon={<span>✕</span>} />
          </>
        )}
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
          statusValue={usesLifecycleTabs ? listTabFilter : statusFilter}
          onStatusChange={usesLifecycleTabs ? setListTabFilter : setStatusFilter}
        />

        {listScope === 'all' && isSuperAdmin && dashboardView === 'opportunities' && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-100 bg-amber-50/40 px-4 py-2 sm:px-6">
            <p className="text-xs text-amber-900">
              Temporary cleanup — clears pending Party A requests only (not ready for review).
            </p>
            <button
              type="button"
              onClick={handleDismissAllPendingUpdates}
              disabled={dismissAllLoading}
              className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-60"
            >
              {dismissAllLoading ? 'Clearing…' : 'Clear all pending update requests'}
            </button>
          </div>
        )}

        <ProposalOpportunitiesFilterBar
          conferenceKey={conferenceFilter}
          onConferenceChange={setConferenceFilter}
          conferences={filterOptions?.conferences || []}
          selectedConference={selectedConference}
          sector={advancedFilters.sector}
          onSectorChange={(v) => setAdvanced('sector', v)}
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
          sectors={filterOptions?.sectors || []}
          mouLifecycleStatuses={mouLifecycleStatuses}
          hideSectorFilter={listScope !== 'all'}
          hideMouLifecycleFilter={usesLifecycleTabs}
          showArchiveFilter={listScope === 'all'}
          archiveFilter={archiveFilter}
          onArchiveFilterChange={setArchiveFilter}
          onClearAll={clearAllFilters}
          hasActiveFilters={
            hasActiveFilters ||
            (usesLifecycleTabs ? listTabFilter !== 'all' : Boolean(statusFilter))
          }
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
            showArchiveStatus={listScope === 'all'}
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
