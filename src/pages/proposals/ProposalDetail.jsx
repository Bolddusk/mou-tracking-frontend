import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useLocation, useSearchParams } from 'react-router-dom'
import * as activitiesApi from '../../api/activities'
import * as mmApi from '../../api/matchmaking'
import * as proposalsApi from '../../api/proposals'
import {
  ActionGroup,
  ApproveIcon,
  IconButton,
  RejectIcon,
} from '../../components/ActionIcons'
import Alert from '../../components/Alert'
import DocLink from '../../components/DocLink'
import FilePreviewModal from '../../components/FilePreviewModal'
import LoadingSpinner from '../../components/LoadingSpinner'
import Modal from '../../components/Modal'
import PartyBCredentialsModal from '../../components/PartyBCredentialsModal'
import ProposalChatPanel from '../../components/proposal/ProposalChatPanel'
import ProposalMouPartyCards from '../../components/proposal/ProposalMouPartyCards'
import ProposalMouFieldsEditor from '../../components/proposal/ProposalMouFieldsEditor'
import ProposalPartyContactsEditor from '../../components/proposal/ProposalPartyContactsEditor'
import ProposalExportMenu from '../../components/proposal/ProposalExportMenu'
import ProposalExportReportModal from '../../components/proposal/ProposalExportReportModal'
import MmMouPanel from '../../components/matchmaking/MmMouPanel'
import MmMouStatusBadge from '../../components/matchmaking/MmMouStatusBadge'
import ProposalDetailPanel from '../../components/ProposalDetailPanel'
import ProposalChangeLogTimeline from '../../components/proposals/ProposalChangeLogTimeline'
import ProposalChangeLogReportActions from '../../components/proposals/ProposalChangeLogReportActions'
import PokeStatusBadge from '../../components/PokeStatusBadge'
import StatusBadge from '../../components/StatusBadge'
import { useAuth } from '../../context/AuthContext'
import { getEngagementLabel, getProposalDisplayTitle } from '../../constants/proposalTemplate'
import { getPakistaniCompanyDisplay } from '../../utils/proposalDisplay'
import { isMatchMouReady } from '../../constants/matchmaking'
import { ROLE_LABELS, ROLES } from '../../constants/sectors'
import { formatDate, getErrorMessage, resolveFileUrl } from '../../utils/format'
import { formatUpdateRequestLabel } from '../../utils/proposalDisplay'
import { loadDraftFromProposal } from '../../utils/proposalDraft'
import {
  buildCredentialPrompts,
  getPartyContactSaveFeedback,
  mergeProposalAfterPartyContacts,
  needsPartyAAccountSetup,
} from '../../utils/partyContactProvision'

const ACTIVITY_STATUS_STYLES = {
  pending: 'bg-amber-100 text-amber-800 ring-amber-200',
  approved: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
  rejected: 'bg-red-100 text-red-800 ring-red-200',
}

/** Matchmaking engagement proposals only — skip for legacy direct MOUs. */
function shouldLoadEngagementMatch(proposal) {
  if (!proposal) return false
  if (proposal.side === 'side_a' || proposal.side === 'side_b') return true
  if (proposal.mm_proposal_id) return true
  if (proposal.parent_mm_proposal_id) return true
  if (proposal.engagement_proposal_id && proposal.engagement_proposal_id === proposal.id) {
    return true
  }
  return false
}

export default function ProposalDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const {
    isPartyA,
    isPartyB,
    isSectorLead,
    isSuperAdmin,
    isRegionalFocalPoint,
    isFocalPoint,
    dashboardPath,
    user,
    token,
  } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const [proposal, setProposal] = useState(null)
  const [conferences, setConferences] = useState([])
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const [showAddActivity, setShowAddActivity] = useState(false)
  const [respondMode, setRespondMode] = useState(false)
  const [respondPokeActivityId, setRespondPokeActivityId] = useState(null)
  const [activityForm, setActivityForm] = useState({
    activity_date: new Date().toISOString().slice(0, 10),
    title: '',
    description: '',
    support_file_url: '',
    comment: '',
  })
  const [activityUploading, setActivityUploading] = useState(false)

  const [filePreview, setFilePreview] = useState(null)
  const [approveTarget, setApproveTarget] = useState(null)
  const [approveComment, setApproveComment] = useState('')
  const [rejectTarget, setRejectTarget] = useState(null)
  const [rejectComment, setRejectComment] = useState('')
  const [commentDrafts, setCommentDrafts] = useState({})
  const [expandedComments, setExpandedComments] = useState({})
  const [expandedActivityId, setExpandedActivityId] = useState(null)
  const [exportPreview, setExportPreview] = useState(null)
  const [exportLoading, setExportLoading] = useState(false)
  const [mmMatch, setMmMatch] = useState(null)
  const [mouStatus, setMouStatus] = useState(null)
  const [contactsEditorOpen, setContactsEditorOpen] = useState(false)
  const [fieldsEditorOpen, setFieldsEditorOpen] = useState(false)
  const [statusSaving, setStatusSaving] = useState(false)
  const [changeLogRefreshKey, setChangeLogRefreshKey] = useState(0)
  const [credentialModal, setCredentialModal] = useState(null)
  const credentialQueueRef = useRef([])

  const canReview = isSectorLead || isSuperAdmin
  const canExportReport = canReview
  const canPoke = canReview

  const isRfpEngagement = useMemo(() => {
    return Boolean(
      (isRegionalFocalPoint || isFocalPoint) && mmMatch && isMatchMouReady(mmMatch.status),
    )
  }, [isRegionalFocalPoint, isFocalPoint, mmMatch])

  const isMatchmakingEngagement = useMemo(() => {
    return Boolean(mmMatch && isMatchMouReady(mmMatch.status))
  }, [mmMatch])

  const isDealClosed = useMemo(() => {
    return proposal?.status === 'completed' || mouStatus === 'deal_closed'
  }, [proposal?.status, mouStatus])

  const canChat = useMemo(() => {
    if (!proposal || isDealClosed) return false
    if (proposal.capabilities?.can_view_chat) return true
    if (proposal.capabilities?.can_view_chat === false) return false
    if (proposal.status !== 'approved' || !proposal.party_b_user_id) return false
    if (isPartyA || isPartyB || isSuperAdmin) return true
    if (isSectorLead && user?.sector && proposal.sector === user.sector) return true
    if (isMatchmakingEngagement && (isSectorLead || isRegionalFocalPoint || isFocalPoint)) {
      return true
    }
    return false
  }, [
    proposal,
    isPartyA,
    isPartyB,
    isSuperAdmin,
    isSectorLead,
    isRegionalFocalPoint,
    isFocalPoint,
    isMatchmakingEngagement,
    user?.sector,
    isDealClosed,
  ])

  const isMatchmakingMou = isMatchmakingEngagement

  const isDirectMou = useMemo(() => {
    return Boolean(!mmMatch && proposal?.capabilities?.can_view_mou)
  }, [mmMatch, proposal])

  const canMou = isMatchmakingMou || isDirectMou

  const canEditMou = useMemo(() => {
    if (!canMou || isDealClosed) return false
    if (isDirectMou) {
      return Boolean(proposal?.capabilities?.can_upload_mou)
    }
    if (mouStatus === 'deal_closed') return false
    if (proposal?.capabilities?.can_upload_mou) return true
    return isPartyA || isPartyB || isSectorLead || isSuperAdmin
  }, [canMou, isDirectMou, isDealClosed, proposal, mouStatus, isPartyA, isPartyB, isSectorLead, isSuperAdmin])

  const canCloseDeal = useMemo(() => {
    if (isDealClosed) return false
    if (isDirectMou) {
      return Boolean(proposal?.capabilities?.can_close_deal)
    }
    if (!isMatchmakingMou) return false
    if (!isSectorLead && !isSuperAdmin) return false
    if (mouStatus !== 'signed') return false
    if (isSuperAdmin) return true
    const sector = mmMatch?.sector || proposal?.sector
    return Boolean(
      isSectorLead &&
        user?.sector &&
        (sector === user.sector || mmMatch?.matched_by === user?.id),
    )
  }, [
    isDealClosed,
    isDirectMou,
    isMatchmakingMou,
    proposal,
    mouStatus,
    isSectorLead,
    isSuperAdmin,
    mmMatch?.sector,
    mmMatch?.matched_by,
    user?.sector,
    user?.id,
  ])

  const canMarkSigned = (isSectorLead || isSuperAdmin) && !isDealClosed

  const canEditPartyContacts = Boolean(proposal?.capabilities?.can_edit_party_contacts)
  const canEditFields = Boolean(proposal?.capabilities?.can_edit_fields)
  const canManagePartyContacts = canEditPartyContacts || isSuperAdmin
  const canViewCompanies = isSuperAdmin || isSectorLead
  const isAdminRole = isSuperAdmin || user?.role === ROLES.ADMIN

  const openFieldsEditor = () => setFieldsEditorOpen(true)

  const bumpChangeLogs = () => setChangeLogRefreshKey((k) => k + 1)

  const handleFieldsSaved = (res) => {
    if (res?.proposal) {
      setProposal((prev) => ({
        ...prev,
        ...res.proposal,
        capabilities: res.capabilities || prev?.capabilities,
      }))
    }
    setSuccess(res?.message || 'Proposal fields updated successfully')
    bumpChangeLogs()
  }

  const handleOperationalStatusChange = useCallback(
    async (status) => {
      if (!proposal?.id) return
      setStatusSaving(true)
      setError('')
      try {
        const res = await proposalsApi.patchProposalFields(proposal.id, {
          executive_summary: { mou_operational_status: status },
        })
        handleFieldsSaved(res)
      } catch (err) {
        setError(getErrorMessage(err))
      } finally {
        setStatusSaving(false)
      }
    },
    [proposal?.id],
  )

  const enqueueCredentialPrompts = (prompts) => {
    if (!prompts.length) return
    credentialQueueRef.current = prompts.slice(1)
    setCredentialModal(prompts[0])
  }

  const closeCredentialModal = () => {
    const next = credentialQueueRef.current.shift()
    if (next) setCredentialModal(next)
    else setCredentialModal(null)
  }

  const handlePartyContactsSaved = async (res) => {
    setProposal((prev) => mergeProposalAfterPartyContacts(prev, res))

    try {
      const refreshed = await proposalsApi.getProposalById(id)
      setProposal(refreshed)
    } catch {
      // merge above is enough if refetch fails
    }

    const { success, errors } = getPartyContactSaveFeedback(res)
    setSuccess(success)
    if (errors.length) setError(errors.join(' '))

    enqueueCredentialPrompts(buildCredentialPrompts(res.party_a, res.party_b))
    bumpChangeLogs()
  }

  const activeTab = useMemo(() => {
    const tab = searchParams.get('tab')
    if (tab === 'chat' && canChat) return 'chat'
    if (tab === 'mou' && canMou) return 'mou'
    if (tab === 'activities') return 'activities'
    if (tab === 'history') return 'history'
    if (tab === 'companies' && canViewCompanies) return 'companies'
    return 'details'
  }, [searchParams, canChat, canMou, canViewCompanies])

  const setTab = (tab) => {
    if (tab === 'chat' && canChat) {
      setSearchParams({ tab: 'chat' }, { replace: true })
    } else if (tab === 'mou' && canMou) {
      setSearchParams({ tab: 'mou' }, { replace: true })
    } else if (tab === 'activities') {
      setSearchParams({ tab: 'activities' }, { replace: true })
    } else if (tab === 'history') {
      setSearchParams({ tab: 'history' }, { replace: true })
    } else if (tab === 'companies' && canViewCompanies) {
      setSearchParams({ tab: 'companies' }, { replace: true })
    } else {
      setSearchParams({}, { replace: true })
    }
  }

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [prop, actRes] = await Promise.all([
        proposalsApi.getProposalById(id),
        activitiesApi.getProposalActivities(id),
      ])
      setProposal(prop)
      setActivities(actRes.activities || [])

      if (shouldLoadEngagementMatch(prop)) {
        try {
          const match = await mmApi.getEngagementMatch(id)
          setMmMatch(match)
          if (match?.id && isMatchMouReady(match.status)) {
            try {
              const mou = await mmApi.getMatchMou(match.id)
              setMouStatus(mou?.mou_status ?? null)
            } catch {
              setMouStatus(null)
            }
          } else {
            setMouStatus(null)
          }
        } catch {
          setMmMatch(null)
          setMouStatus(null)
        }
      } else {
        setMmMatch(null)
        if (prop?.capabilities?.can_view_mou) {
          try {
            const mou = await proposalsApi.getProposalMou(id)
            setMouStatus(mou?.mou_status ?? null)
          } catch {
            setMouStatus(null)
          }
        } else {
          setMouStatus(null)
        }
      }
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [id])

  const handleDealClosed = useCallback(
    async (res) => {
      if (res?.proposal) {
        setProposal((prev) =>
          prev
            ? {
                ...prev,
                ...res.proposal,
                capabilities: res.capabilities ?? prev.capabilities,
              }
            : prev,
        )
      }
      if (res?.match) {
        setMmMatch((prev) => (prev ? { ...prev, ...res.match } : prev))
      }
      setMouStatus('deal_closed')
      setSuccess(res?.message || 'Deal closed successfully')
      await load()
      bumpChangeLogs()
    },
    [load],
  )

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    let cancelled = false
    proposalsApi
      .getProposalFilterOptions()
      .then((data) => {
        if (!cancelled) setConferences(data?.conferences || [])
      })
      .catch(() => {
        if (!cancelled) setConferences([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (activities.length === 0) {
      setExpandedActivityId(null)
      return
    }
    const pokeId = proposal?.poke_status?.poke_activity_id
    if (pokeId && activities.some((a) => a.id === pokeId)) {
      setExpandedActivityId(pokeId)
      return
    }
    setExpandedActivityId(activities[activities.length - 1].id)
  }, [activities, proposal?.poke_status?.poke_activity_id])

  useEffect(() => {
    if (
      location.state?.respondToPoke &&
      proposal?.poke_status?.status === 'pending_response' &&
      isPartyA
    ) {
      setRespondMode(true)
      setRespondPokeActivityId(
        location.state?.pokeActivityId || proposal.poke_status?.poke_activity_id || null
      )
      setShowAddActivity(true)
      window.history.replaceState({}, '')
    }
  }, [location.state, proposal, isPartyA])

  const openActivityModal = (pokeResponse = false, pokeActivityId = null) => {
    setRespondMode(pokeResponse)
    setRespondPokeActivityId(
      pokeActivityId || proposal?.poke_status?.poke_activity_id || null
    )
    setShowAddActivity(true)
  }

  const closeActivityModal = () => {
    setShowAddActivity(false)
    setRespondMode(false)
    setRespondPokeActivityId(null)
    setActivityForm({
      activity_date: new Date().toISOString().slice(0, 10),
      title: '',
      description: '',
      support_file_url: '',
      comment: '',
    })
  }

  const handlePreviewExport = async () => {
    if (!proposal?.id) return
    setExportLoading(true)
    setError('')
    try {
      const report = await proposalsApi.getProposalExportReport(proposal.id)
      setExportPreview(report)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setExportLoading(false)
    }
  }

  useEffect(() => {
    const exportFormat = searchParams.get('export')
    const allowed = ['pdf', 'xlsx', 'xls', 'csv']
    if (loading || !proposal || !allowed.includes(exportFormat)) return
    if (!canExportReport || proposal.status === 'draft') return

    let cancelled = false
    ;(async () => {
      setExportLoading(true)
      setError('')
      try {
        await proposalsApi.downloadProposalExport(proposal.id, exportFormat)
        if (!cancelled) {
          const next = new URLSearchParams(searchParams)
          next.delete('export')
          setSearchParams(next, { replace: true })
        }
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err))
      } finally {
        if (!cancelled) setExportLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [loading, proposal, canExportReport, searchParams, setSearchParams])

  const handlePoke = async () => {
    setActionLoading(true)
    setError('')
    setSuccess('')
    try {
      await activitiesApi.pokeForUpdate(id)
      setSuccess('Update requested — Party A has been notified')
      await load()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setActionLoading(false)
    }
  }

  const handleAddActivity = async () => {
    if (!activityForm.title.trim()) return
    setActionLoading(true)
    setError('')
    const isPokeResponse = respondMode && respondPokeActivityId
    try {
      const payload = {
        activity_date: activityForm.activity_date,
        title: activityForm.title.trim(),
        description: activityForm.description.trim() || undefined,
        support_file_url: activityForm.support_file_url || undefined,
        comment: activityForm.comment.trim() || undefined,
      }

      if (isPokeResponse) {
        await activitiesApi.respondToPoke(respondPokeActivityId, payload)
      } else {
        await activitiesApi.createActivity(id, payload)
      }

      closeActivityModal()
      setSuccess(
        isPokeResponse
          ? 'Update response saved — status marked as Answered'
          : 'Activity update recorded'
      )
      await load()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setActionLoading(false)
    }
  }

  const handleApproveActivity = async () => {
    if (!approveTarget) return
    setActionLoading(true)
    setError('')
    try {
      await activitiesApi.approveActivity(approveTarget.id, approveComment.trim())
      setApproveTarget(null)
      setApproveComment('')
      setSuccess('Activity approved')
      await load()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setActionLoading(false)
    }
  }

  const handleRejectActivity = async () => {
    if (!rejectTarget || !rejectComment.trim()) return
    setActionLoading(true)
    setError('')
    try {
      await activitiesApi.rejectActivity(rejectTarget.id, rejectComment.trim())
      setRejectTarget(null)
      setRejectComment('')
      setSuccess('Activity rejected')
      await load()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setActionLoading(false)
    }
  }

  const handleAddComment = async (activityId) => {
    const text = commentDrafts[activityId]
    if (!text?.trim()) return
    setActionLoading(true)
    setError('')
    try {
      await activitiesApi.addActivityComment(activityId, text.trim())
      setCommentDrafts((d) => ({ ...d, [activityId]: '' }))
      await load()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setActionLoading(false)
    }
  }

  const pendingPokeActivityId = useMemo(() => {
    if (proposal?.poke_status?.status !== 'pending_response') return null
    if (proposal.poke_status.poke_activity_id) return proposal.poke_status.poke_activity_id
    for (let i = activities.length - 1; i >= 0; i--) {
      if (activities[i].can_respond) return activities[i].id
    }
    return null
  }, [activities, proposal?.poke_status])

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!proposal) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <p className="text-slate-600">Proposal not found</p>
        <Link
          to={dashboardPath}
          className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-green-600 hover:underline"
        >
          ← Back to dashboard
        </Link>
      </div>
    )
  }

  const isDraft = proposal.status === 'draft'
  const isRejected = proposal.status === 'rejected'
  const canPartyAEditRejected = isPartyA && isRejected && !mmMatch
  const canTrackActivities = proposal.status !== 'draft'
  const canWriteActivities =
    canTrackActivities &&
    !isRfpEngagement &&
    !isDealClosed &&
    proposal.capabilities?.can_add_activity !== false
  const canPokeActions = canPoke && canWriteActivities
  const pendingCount = activities.filter((a) => a.status === 'pending').length
  const backPath = isRfpEngagement ? '/matchmaking/matches' : dashboardPath
  const backLabel = isRfpEngagement ? 'Matches' : 'Dashboard'

  return (
    <div className="w-full space-y-6 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to={backPath}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50"
        >
          ← {backLabel}
        </Link>
        <div className="flex flex-wrap gap-2">
          {canEditFields && (
            <button
              type="button"
              onClick={openFieldsEditor}
              className="inline-flex items-center gap-2 rounded-lg border border-green-700/30 bg-green-50 px-4 py-2 text-sm font-semibold text-green-900 shadow-sm hover:bg-green-100"
            >
              Edit MOU fields
            </button>
          )}
          {canExportReport && canWriteActivities && (
            <>
              <ProposalExportMenu proposalId={proposal?.id} onError={setError} />
              <button
                type="button"
                onClick={handlePreviewExport}
                disabled={exportLoading}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
              >
                Preview Report
              </button>
            </>
          )}
          {canPokeActions && (
            <button
              type="button"
              onClick={handlePoke}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-900 shadow-sm hover:bg-amber-100 disabled:opacity-60"
            >
              🔔 Request for Update
            </button>
          )}
          {canWriteActivities && (
            <button
              type="button"
              onClick={() => openActivityModal(false)}
              className="inline-flex items-center gap-2 rounded-lg bg-portal-primary px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:bg-green-400"
            >
              + Add Activity
            </button>
          )}
          {isMatchmakingEngagement && mmMatch?.id && (
            <Link
              to={`/matchmaking/matches/${mmMatch.id}/mou`}
              className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-100"
            >
              Open match MOU
            </Link>
          )}
        </div>
      </div>

      {isRfpEngagement && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          <strong>Read-only engagement view</strong> — China RFP can monitor chat and activities.
          MOU upload is handled by Party A, Party B, and Sector Lead.
        </div>
      )}

      {isRejected && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          <p className="font-semibold">Rejected by Sector Lead</p>
          {proposal.sector_lead_comment ? (
            <p className="mt-1 whitespace-pre-wrap">{proposal.sector_lead_comment}</p>
          ) : (
            <p className="mt-1">Update your proposal and resubmit for review.</p>
          )}
          {canPartyAEditRejected && (
            <button
              type="button"
              onClick={() => {
                loadDraftFromProposal(proposal)
                navigate('/proposals/new')
              }}
              className="mt-3 inline-flex rounded-lg bg-portal-primary px-4 py-2 text-xs font-semibold text-white hover:bg-portal-primary-hover"
            >
              Edit & Resubmit
            </button>
          )}
        </div>
      )}

      {proposal.poke_status?.status === 'pending_response' &&
        !isDealClosed &&
        (isPartyA || canReview) && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <div>
            <strong>Update requested:</strong>{' '}
            {formatUpdateRequestLabel(proposal.poke_status.label)}
            {isPartyA && (
              <p className="mt-1 text-xs">
                Add what you completed (use the actual work date), attach proof document, and optional comment.
              </p>
            )}
          </div>
          {isPartyA && (
            <button
              type="button"
              onClick={() => openActivityModal(true, pendingPokeActivityId)}
              className="shrink-0 rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700"
            >
              Respond to Update Request
            </button>
          )}
        </div>
      )}

      <Alert type="error" message={error} onClose={() => setError('')} />
      <Alert type="success" message={success} onClose={() => setSuccess('')} />

      {isDealClosed && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          <strong>Deal closed</strong>
          {(proposal.deal_closed_by_name || mmMatch?.deal_closed_by_name) && (
            <span>
              {' '}
              by {proposal.deal_closed_by_name || mmMatch?.deal_closed_by_name}
            </span>
          )}
          {(proposal.deal_closed_at || mmMatch?.deal_closed_at) && (
            <span className="text-slate-500">
              {' '}
              · {formatDate(proposal.deal_closed_at || mmMatch?.deal_closed_at)}
            </span>
          )}
          <span className="text-slate-500"> — no further edits allowed.</span>
        </div>
      )}

      {/* Hero */}
      <div className="overflow-hidden rounded-2xl bg-sidebar text-white shadow-lg">
        <div className="border-b border-white/10 bg-gradient-to-r from-sidebar to-green-900 px-6 py-6 sm:px-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-portal-primary">
                  Opportunity #{proposal.id}
                </p>
                {proposal.engagement_type && (
                  <span className="rounded-full bg-portal-primary/15 px-2.5 py-0.5 text-[11px] font-semibold text-portal-primary ring-1 ring-portal-primary/30">
                    {getEngagementLabel(proposal.engagement_type)}
                  </span>
                )}
              </div>
              <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                {getProposalDisplayTitle(proposal)}
              </h1>
              <p className="mt-2 text-sm text-slate-300">
                {proposal.conference_info?.conference_name && (
                  <span>{proposal.conference_info.conference_name}</span>
                )}
                {proposal.conference_info?.conference_name && proposal.sector ? ' · ' : ''}
                {proposal.company_name && proposal.venture_name
                  ? `${proposal.company_name} · ${proposal.sector}`
                  : proposal.sector}
                {proposal.project_type ? ` · ${proposal.project_type}` : ''}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <StatusBadge status={proposal.status} />
              {canMou && mouStatus && <MmMouStatusBadge status={mouStatus} />}
              <PokeStatusBadge pokeStatus={proposal.poke_status} variant="onDark" />
            </div>
          </div>
        </div>
        <div className="grid gap-px bg-white/10 sm:grid-cols-3">
          <HeroStat
            label="Pakistani Company"
            value={getPakistaniCompanyDisplay(proposal)}
          />
          <HeroStat
            label="Submitted"
            value={formatDate(proposal.submitted_at || proposal.created_at)}
          />
          <HeroStat
            label="Activities"
            value={canTrackActivities ? `${activities.length} (${pendingCount} pending)` : '—'}
          />
        </div>
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        <DetailTabButton active={activeTab === 'details'} onClick={() => setTab('details')}>
          Details
        </DetailTabButton>
        {canViewCompanies && (
          <DetailTabButton active={activeTab === 'companies'} onClick={() => setTab('companies')}>
            Companies
          </DetailTabButton>
        )}
        {canTrackActivities && (
          <DetailTabButton active={activeTab === 'activities'} onClick={() => setTab('activities')}>
            Activities
            {pendingCount > 0 && (
              <span className="ml-1.5 inline-flex rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                {pendingCount}
              </span>
            )}
          </DetailTabButton>
        )}
        {canChat && (
          <DetailTabButton active={activeTab === 'chat'} onClick={() => setTab('chat')}>
            Chat
          </DetailTabButton>
        )}
        {canMou && (
          <DetailTabButton active={activeTab === 'mou'} onClick={() => setTab('mou')}>
            MOU
          </DetailTabButton>
        )}
        <DetailTabButton active={activeTab === 'history'} onClick={() => setTab('history')}>
          Change History
        </DetailTabButton>
      </div>

      {activeTab === 'history' ? (
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 px-6 py-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Change History</h2>
              <p className="text-sm text-slate-500">
                Audit trail — field-level before and after values
              </p>
            </div>
            <ProposalChangeLogReportActions
              proposalId={Number(id)}
              proposalLabel={proposal ? getProposalDisplayTitle(proposal) : ''}
            />
          </div>
          <ProposalChangeLogTimeline
            proposalId={Number(id)}
            enabled={activeTab === 'history'}
            refreshKey={changeLogRefreshKey}
          />
        </section>
      ) : activeTab === 'companies' ? (
        <div className="space-y-6">
          {proposal && (
            <ProposalMouPartyCards
              proposal={proposal}
              canEditContacts={canManagePartyContacts}
              onEditContacts={() => setContactsEditorOpen(true)}
            />
          )}
          {canManagePartyContacts && (
            <div className="flex flex-col gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1 text-sm text-green-900">
                {needsPartyAAccountSetup(proposal) && (
                  <p>
                    <strong>Party A not linked</strong> — enter contact name + email to create
                    their portal login.
                  </p>
                )}
                {!proposal.party_b_user_id && (
                  <p>
                    <strong>Party B not linked</strong> — add their email and save to enable chat
                    login.
                  </p>
                )}
                {!needsPartyAAccountSetup(proposal) && proposal.party_b_user_id && (
                  <p>You can update Party A and Party B contact details for this proposal.</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setContactsEditorOpen(true)}
                className="shrink-0 rounded-lg bg-portal-primary px-4 py-2 text-sm font-semibold text-white hover:bg-portal-primary-hover"
              >
                Edit contacts
              </button>
            </div>
          )}
        </div>
      ) : activeTab === 'mou' ? (
        <div className="space-y-6">
          <MmMouPanel
          matchId={isMatchmakingMou ? mmMatch?.id : undefined}
          proposalId={isDirectMou ? id : undefined}
          canEdit={canEditMou}
          canMarkSigned={canMarkSigned}
          canCloseDeal={canCloseDeal}
          onStatusChange={setMouStatus}
          onDealClosed={handleDealClosed}
        />
        </div>
      ) : activeTab === 'chat' ? (
        <ProposalChatPanel
          proposalId={Number(id)}
          token={token}
          currentUserId={user?.id}
          enabled={activeTab === 'chat' && canChat}
        />
      ) : activeTab === 'activities' ? (
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Activity Log</h2>
              <p className="text-sm text-slate-500">Progress updates and review history</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {activities.length} entries
            </span>
          </div>

          <div className="px-2 py-2 sm:px-4">
            {activities.length === 0 ? (
              <EmptyState
                icon="📭"
                title="No activities yet"
                text="Add a progress update or request an update from Party A."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-[760px] w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="whitespace-nowrap px-4 py-3 font-semibold">Date</th>
                      <th className="px-4 py-3 font-semibold">Update</th>
                      <th className="whitespace-nowrap px-4 py-3 font-semibold">Added by</th>
                      <th className="whitespace-nowrap px-4 py-3 font-semibold">Status</th>
                      <th className="whitespace-nowrap px-4 py-3 font-semibold text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activities.map((activity) => (
                      <ActivityTableRow
                        key={activity.id}
                        activity={activity}
                        isExpanded={expandedActivityId === activity.id}
                        onToggleExpand={() =>
                          setExpandedActivityId((prev) =>
                            prev === activity.id ? null : activity.id,
                          )
                        }
                        canReview={canReview && !isRfpEngagement && !isDealClosed}
                        canComment={!isRfpEngagement && !isDealClosed}
                        actionLoading={actionLoading}
                        expanded={expandedComments[activity.id]}
                        commentDraft={commentDrafts[activity.id] || ''}
                        onToggleComments={() =>
                          setExpandedComments((e) => ({ ...e, [activity.id]: !e[activity.id] }))
                        }
                        onCommentDraftChange={(val) =>
                          setCommentDrafts((d) => ({ ...d, [activity.id]: val }))
                        }
                        onAddComment={() => handleAddComment(activity.id)}
                        onOpenFile={(url, title) =>
                          setFilePreview({ url: resolveFileUrl(url), title })
                        }
                        onApprove={() => {
                          setApproveTarget(activity)
                          setApproveComment('')
                        }}
                        onReject={() => {
                          setRejectTarget(activity)
                          setRejectComment('')
                        }}
                        showRespondToPoke={isPartyA && activity.can_respond}
                        onRespondToPoke={() => openActivityModal(true, activity.id)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      ) : (
        <>
          <ProposalDetailPanel
            proposal={proposal}
            conferences={conferences}
            onEditFields={canEditFields ? openFieldsEditor : undefined}
            canEditStatus={canEditFields}
            onStatusChange={handleOperationalStatusChange}
            statusSaving={statusSaving}
            onOpenFile={(url, title) => setFilePreview({ url, title })}
          />
        </>
      )}

      <Modal
        open={showAddActivity}
        title={respondMode ? 'Respond to Update Request' : 'Add Activity Update'}
        onClose={closeActivityModal}
        onConfirm={handleAddActivity}
        confirmLabel={respondMode ? 'Submit Response' : 'Submit Update'}
        loading={actionLoading || activityUploading}
        confirmDisabled={
          !activityForm.title.trim() ||
          activityUploading ||
          (respondMode && !respondPokeActivityId)
        }
      >
        <div className="space-y-3">
          {respondMode && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              {formatUpdateRequestLabel(proposal.poke_status?.label)}. Your answer will appear on
              the same update request (work date, proof, comment) — not as a separate timeline row.
            </p>
          )}
          <Field label="Work Date (past dates allowed)">
            <input
              type="date"
              value={activityForm.activity_date}
              onChange={(e) =>
                setActivityForm((f) => ({ ...f, activity_date: e.target.value }))
              }
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-slate-500">
              Select the date when this work actually happened
            </p>
          </Field>
          <Field label="Title">
            <input
              type="text"
              value={activityForm.title}
              onChange={(e) => setActivityForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Site visit completed on 15 May"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </Field>
          <Field label="What was done?">
            <textarea
              rows={3}
              value={activityForm.description}
              onChange={(e) =>
                setActivityForm((f) => ({ ...f, description: e.target.value }))
              }
              placeholder="Describe progress, milestones, or actions taken…"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Proof / Support Document (PDF, DOC)">
            <input
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              disabled={activityUploading}
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                setActivityUploading(true)
                setError('')
                try {
                  const { file_url } = await activitiesApi.uploadActivitySupport(file)
                  setActivityForm((f) => ({ ...f, support_file_url: file_url }))
                } catch (err) {
                  setError(getErrorMessage(err))
                } finally {
                  setActivityUploading(false)
                  e.target.value = ''
                }
              }}
              className="w-full text-sm text-slate-600 file:mr-2 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm"
            />
            {activityUploading && (
              <p className="mt-1 text-xs text-slate-500">Uploading…</p>
            )}
            {activityForm.support_file_url && !activityUploading && (
              <p className="mt-1 text-xs text-green-600">Document attached ✓</p>
            )}
          </Field>
          <Field label="Comment (optional)">
            <textarea
              rows={2}
              value={activityForm.comment}
              onChange={(e) => setActivityForm((f) => ({ ...f, comment: e.target.value }))}
              placeholder="Any extra note for Sector Lead / Admin…"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </Field>
        </div>
      </Modal>

      <ProposalExportReportModal
        open={Boolean(exportPreview)}
        report={exportPreview}
        onClose={() => setExportPreview(null)}
        onExportError={setError}
      />

      <FilePreviewModal
        open={Boolean(filePreview)}
        title={filePreview?.title}
        fileUrl={filePreview?.url}
        onClose={() => setFilePreview(null)}
      />

      <ProposalPartyContactsEditor
        open={contactsEditorOpen}
        proposalId={Number(id)}
        proposal={proposal}
        onClose={() => setContactsEditorOpen(false)}
        onSaved={handlePartyContactsSaved}
      />

      <ProposalMouFieldsEditor
        open={fieldsEditorOpen}
        proposalId={Number(id)}
        proposal={proposal}
        isAdmin={isAdminRole}
        onClose={() => setFieldsEditorOpen(false)}
        onSaved={handleFieldsSaved}
      />

      <PartyBCredentialsModal
        open={Boolean(credentialModal)}
        title={credentialModal?.title}
        credentials={credentialModal?.credentials}
        subtitle={credentialModal?.subtitle}
        onClose={closeCredentialModal}
      />

      <Modal
        open={Boolean(approveTarget)}
        title="Approve Activity"
        onClose={() => setApproveTarget(null)}
        onConfirm={handleApproveActivity}
        confirmLabel="Approve"
        loading={actionLoading}
      >
        <p className="mb-3 text-sm text-slate-600">
          <strong>{approveTarget?.title}</strong>
        </p>
        <textarea
          rows={3}
          value={approveComment}
          onChange={(e) => setApproveComment(e.target.value)}
          placeholder="Optional comment"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
      </Modal>

      <Modal
        open={Boolean(rejectTarget)}
        title="Reject Activity"
        onClose={() => setRejectTarget(null)}
        onConfirm={handleRejectActivity}
        confirmLabel="Reject"
        confirmVariant="danger"
        loading={actionLoading}
        confirmDisabled={!rejectComment.trim()}
      >
        <textarea
          rows={3}
          value={rejectComment}
          onChange={(e) => setRejectComment(e.target.value)}
          placeholder="Rejection reason (required)"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
      </Modal>
    </div>
  )
}

function HeroStat({ label, value }) {
  return (
    <div className="bg-white/5 px-6 py-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-white">{value}</p>
    </div>
  )
}

function EmptyState({ icon, title, text }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-14 text-center">
      <p className="text-3xl">{icon}</p>
      <p className="mt-3 font-semibold text-slate-700">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{text}</p>
    </div>
  )
}

function ActivityTableRow({
  activity,
  isExpanded,
  onToggleExpand,
  canReview,
  canComment = true,
  actionLoading,
  expanded,
  commentDraft,
  onToggleComments,
  onCommentDraftChange,
  onAddComment,
  onOpenFile,
  onApprove,
  onReject,
  showRespondToPoke,
  onRespondToPoke,
}) {
  const statusStyle =
    ACTIVITY_STATUS_STYLES[activity.status] || ACTIVITY_STATUS_STYLES.pending
  const commentCount = activity.comments?.length || 0
  const approvalCount = activity.approvals?.length || 0
  const roleLabel = ROLE_LABELS[activity.added_by_role] || activity.added_by_role

  return (
    <>
      <tr
        className={`group transition-colors hover:bg-slate-50/80 ${
          showRespondToPoke ? 'bg-amber-50/60' : ''
        } ${isExpanded ? 'bg-slate-50/50' : ''}`}
      >
        <td className="whitespace-nowrap px-4 py-3 align-top text-slate-600">
          <time className="text-xs font-medium">{formatDate(activity.activity_date)}</time>
        </td>
        <td className="max-w-[280px] px-4 py-3 align-top">
          <button type="button" onClick={onToggleExpand} className="w-full text-left">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-semibold text-slate-800">{activity.title}</span>
              {activity.is_poke && (
                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-800">
                  Update request
                </span>
              )}
            </div>
            {!isExpanded && (
              <p className="mt-0.5 truncate text-xs text-slate-500">
                {activity.description ||
                  (activity.poke_response && `Response: ${activity.poke_response.title}`) ||
                  (activity.support_file_url && 'Proof attached') ||
                  '—'}
              </p>
            )}
          </button>
          {activity.is_poke && activity.poke_response && !isExpanded && (
            <p className="mt-1 text-xs text-green-800">
              <span className="font-medium">Party A:</span> {activity.poke_response.title}
            </p>
          )}
        </td>
        <td className="whitespace-nowrap px-4 py-3 align-top">
          <p className="font-medium text-slate-800">{activity.added_by_name}</p>
          <p className="text-xs text-slate-500">{roleLabel}</p>
        </td>
        <td className="whitespace-nowrap px-4 py-3 align-top">
          <span
            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ring-1 ring-inset ${statusStyle}`}
          >
            {activity.status}
          </span>
        </td>
        <td className="whitespace-nowrap px-4 py-3 align-top text-right">
          <div className="flex items-center justify-end gap-1">
            {canReview && activity.status === 'pending' && (
              <ActionGroup>
                <IconButton
                  variant="approve"
                  title="Approve activity"
                  disabled={actionLoading}
                  onClick={(e) => {
                    e.stopPropagation()
                    onApprove()
                  }}
                >
                  <ApproveIcon />
                </IconButton>
                <IconButton
                  variant="reject"
                  title="Reject activity"
                  disabled={actionLoading}
                  onClick={(e) => {
                    e.stopPropagation()
                    onReject()
                  }}
                >
                  <RejectIcon />
                </IconButton>
              </ActionGroup>
            )}
            {commentCount > 0 && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                {commentCount}
              </span>
            )}
            <button
              type="button"
              onClick={onToggleExpand}
              className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              title={isExpanded ? 'Collapse details' : 'Expand details'}
              aria-expanded={isExpanded}
            >
              {isExpanded ? '▾' : '▸'}
            </button>
          </div>
        </td>
      </tr>

      {showRespondToPoke && (
        <tr className="bg-amber-50/80">
          <td colSpan={5} className="border-t border-amber-100 px-4 py-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-amber-900">
                Party A response needed — your answer will be saved on this update request.
              </p>
              <button
                type="button"
                onClick={onRespondToPoke}
                className="shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
              >
                Respond to Update Request
              </button>
            </div>
          </td>
        </tr>
      )}

      {isExpanded && (
        <tr className="bg-slate-50/40">
          <td colSpan={5} className="border-t border-slate-100 px-4 py-4">
            {activity.description && (
              <p className="text-sm leading-relaxed text-slate-600">{activity.description}</p>
            )}
            {!activity.is_poke && activity.support_file_url && (
              <div className={activity.description ? 'mt-2' : ''}>
                <DocLink
                  url={activity.support_file_url}
                  title="View proof document"
                  onOpen={(url) => onOpenFile(url, `Proof — ${activity.title}`)}
                />
              </div>
            )}

            {activity.is_poke && activity.poke_response && (
              <div className="mt-3 rounded-lg border border-green-200 bg-green-50/60 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-green-800">
                  Party A response
                </p>
                <div className="mt-2 space-y-2 text-sm text-slate-700">
                  <p>
                    <span className="font-semibold text-green-800">
                      {formatDate(activity.poke_response.work_date)}
                    </span>
                    {' · '}
                    <span className="font-semibold text-slate-800">
                      {activity.poke_response.title}
                    </span>
                  </p>
                  {activity.poke_response.description && (
                    <p className="leading-relaxed text-slate-600">
                      {activity.poke_response.description}
                    </p>
                  )}
                  {activity.poke_response.support_file_url && (
                    <DocLink
                      url={activity.poke_response.support_file_url}
                      title="View response proof document"
                      onOpen={(url) =>
                        onOpenFile(url, `Poke response — ${activity.poke_response.title}`)
                      }
                    />
                  )}
                  <p className="text-xs text-slate-500">
                    Submitted by {activity.poke_response.submitted_by_name} ·{' '}
                    {formatDate(activity.poke_response.submitted_at)}
                  </p>
                </div>
              </div>
            )}

            {approvalCount > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Reviews
                </p>
                {activity.approvals.map((a) => (
                  <div
                    key={a.id}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600"
                  >
                    <span className="font-semibold text-slate-800">{a.action_by_name}</span>{' '}
                    <span className="capitalize text-slate-500">{a.action}</span> ·{' '}
                    {formatDate(a.actioned_at)}
                    {a.comment && (
                      <p className="mt-1 italic text-slate-500">&ldquo;{a.comment}&rdquo;</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 border-t border-slate-200/80 pt-4">
              <button
                type="button"
                onClick={onToggleComments}
                className="text-xs font-semibold text-green-700 hover:text-green-900"
              >
                {expanded ? '▾ Hide comments' : '▸ Show comments'} ({commentCount})
              </button>

              {expanded && (
                <div className="mt-3 space-y-3">
                  {(activity.comments || []).map((c) => (
                    <div
                      key={c.id}
                      className="rounded-lg border border-slate-100 bg-white p-3 shadow-sm"
                    >
                      <p className="text-sm font-semibold text-slate-800">{c.commented_by_name}</p>
                      <p className="text-xs text-slate-400">
                        {ROLE_LABELS[c.commented_by_role] || c.commented_by_role} ·{' '}
                        {formatDate(c.created_at)}
                      </p>
                      <p className="mt-1.5 text-sm text-slate-600">{c.comment}</p>
                    </div>
                  ))}
                  {canComment && (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={commentDraft}
                        onChange={(e) => onCommentDraftChange(e.target.value)}
                        placeholder="Write a comment…"
                        className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100"
                      />
                      <button
                        type="button"
                        disabled={actionLoading || !(commentDraft || '').trim()}
                        onClick={onAddComment}
                        className="rounded-lg bg-sidebar px-4 py-2 text-xs font-bold text-white hover:bg-sidebar-hover disabled:opacity-50"
                      >
                        Post
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

function DetailTabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
        active
          ? 'border-portal-primary text-green-800'
          : 'border-transparent text-slate-500 hover:text-slate-700'
      }`}
    >
      {children}
    </button>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      {children}
    </div>
  )
}
