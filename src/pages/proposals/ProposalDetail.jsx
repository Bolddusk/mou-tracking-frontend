import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useLocation, useSearchParams } from 'react-router-dom'
import * as activitiesApi from '../../api/activities'
import * as mmApi from '../../api/matchmaking'
import * as proposalsApi from '../../api/proposals'
import Alert from '../../components/Alert'
import FilePreviewModal from '../../components/FilePreviewModal'
import LoadingSpinner from '../../components/LoadingSpinner'
import Modal from '../../components/Modal'
import PartyBCredentialsModal from '../../components/PartyBCredentialsModal'
import ProposalChatPanel from '../../components/proposal/ProposalChatPanel'
import ProposalMouPartyCards from '../../components/proposal/ProposalMouPartyCards'
import ProposalMouFieldsEditor from '../../components/proposal/ProposalMouFieldsEditor'
import ProposalPartyContactsEditor from '../../components/proposal/ProposalPartyContactsEditor'
import ProposalProgressPanel from '../../components/proposal/ProposalProgressPanel'
import ProposalProgressEditModal from '../../components/proposal/ProposalProgressEditModal'
import ProposalUpdateRequestsPanel from '../../components/proposal/ProposalUpdateRequestsPanel'
import ProposalUpdateResponseEditModal from '../../components/proposal/ProposalUpdateResponseEditModal'
import ProposalExportMenu from '../../components/proposal/ProposalExportMenu'
import ProposalExportReportModal from '../../components/proposal/ProposalExportReportModal'
import ProposalSifcReportPreviewModal from '../../components/proposal/ProposalSifcReportPreviewModal'
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
import MouProgressValue from '../../components/proposal/MouProgressValue'
import { getMouConferenceRow, parseExecutiveSummary } from '../../utils/mouConferenceFields'
import { isMatchMouReady } from '../../constants/matchmaking'
import { ROLES } from '../../constants/sectors'
import { formatDate, getErrorMessage } from '../../utils/format'
import { formatUpdateRequestLabel } from '../../utils/proposalDisplay'
import { loadDraftFromProposal } from '../../utils/proposalDraft'
import {
  buildCredentialPrompts,
  getExistingAccountNotices,
  getPartyContactSaveFeedback,
  mergeProposalAfterPartyContacts,
} from '../../utils/partyContactProvision'
import { normalizeProgressListResponse, resolveCanAddProgress } from '../../utils/progressUpdates'
import { mergeProposalAfterFieldsPatch } from '../../utils/proposalFieldsPatch'

const EMPTY_PROGRESS = Object.freeze({
  updates: [],
  rows: [],
  columns: [],
  count: 0,
  canAddProgress: null,
})

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
    isPowerAdmin,
    isRegionalFocalPoint,
    isFocalPoint,
    dashboardPath,
    user,
    token,
  } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const [proposal, setProposal] = useState(null)
  const [conferences, setConferences] = useState([])
  const [progress, setProgress] = useState(EMPTY_PROGRESS)
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
  const [exportPreview, setExportPreview] = useState(null)
  const [sifcPreview, setSifcPreview] = useState(null)
  const [exportLoading, setExportLoading] = useState(false)
  const [sifcPreviewLoading, setSifcPreviewLoading] = useState(false)
  const [progressEditTarget, setProgressEditTarget] = useState(null)
  const [progressDeleteTarget, setProgressDeleteTarget] = useState(null)
  const [unlockRequestTarget, setUnlockRequestTarget] = useState(null)
  const [unlockNote, setUnlockNote] = useState('')
  const [progressCommentTarget, setProgressCommentTarget] = useState(null)
  const [progressCommentText, setProgressCommentText] = useState('')
  const [mmMatch, setMmMatch] = useState(null)
  const [mouStatus, setMouStatus] = useState(null)
  const [contactsEditorOpen, setContactsEditorOpen] = useState(false)
  const [contactsEditSides, setContactsEditSides] = useState('both')
  const [fieldsEditorOpen, setFieldsEditorOpen] = useState(false)
  const [archiveModalOpen, setArchiveModalOpen] = useState(false)
  const [archiveReason, setArchiveReason] = useState('')
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [restoreModalOpen, setRestoreModalOpen] = useState(false)
  const [updateResponseEditOpen, setUpdateResponseEditOpen] = useState(false)
  const [promoteTargetId, setPromoteTargetId] = useState(null)
  const [promoteComment, setPromoteComment] = useState('')
  const [changeLogRefreshKey, setChangeLogRefreshKey] = useState(0)
  const [credentialModal, setCredentialModal] = useState(null)
  const credentialQueueRef = useRef([])

  // Power Admin has the same MOU action surface as Super Admin (progress, update requests, etc.)
  const isMouAdmin = isSuperAdmin || isPowerAdmin
  const canReview = isSectorLead || isMouAdmin
  const isAdminRole = isMouAdmin || user?.role === ROLES.ADMIN
  const canExportReport = canReview || isAdminRole

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
    if (proposal.capabilities?.can_view_chat === true) return true
    if (proposal.capabilities?.can_view_chat === false) return false
    if (proposal.capabilities?.can_send_chat === true) return true
    if (proposal.status !== 'approved' || !proposal.party_b_user_id) return false
    if (isPartyA || isPartyB || isSuperAdmin || isPowerAdmin) return true
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
    isPowerAdmin,
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

  const canUploadMou = Boolean(proposal?.capabilities?.can_upload_mou)
  const canEditMouFields = Boolean(proposal?.capabilities?.can_edit_mou_fields)

  const canEditMou = useMemo(() => {
    if (!canMou || isDealClosed) return false
    if (isDirectMou) {
      return canUploadMou || canEditMouFields
    }
    if (mouStatus === 'deal_closed') return false
    if (canUploadMou || canEditMouFields) return true
    return isPartyA || isPartyB || isSectorLead || isMouAdmin
  }, [
    canMou,
    isDirectMou,
    isDealClosed,
    canUploadMou,
    canEditMouFields,
    proposal,
    mouStatus,
    isPartyA,
    isPartyB,
    isSectorLead,
    isMouAdmin,
  ])

  const canCloseDeal = useMemo(() => {
    if (isDealClosed) return false
    if (isDirectMou) {
      return Boolean(proposal?.capabilities?.can_close_deal)
    }
    if (!isMatchmakingMou) return false
    if (!isSectorLead && !isMouAdmin) return false
    if (mouStatus !== 'signed') return false
    if (isMouAdmin) return true
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
    isMouAdmin,
    mmMatch?.sector,
    mmMatch?.matched_by,
    user?.sector,
    user?.id,
  ])

  const canMarkSigned = canEditMouFields && !isDealClosed

  const caps = proposal?.capabilities || {}
  const isArchived = proposal?.is_archived === true
  const canArchiveProposal = Boolean(caps.can_archive_proposal)
  const canRestoreProposal = Boolean(caps.can_restore_proposal)
  const canDeleteProposal = Boolean(caps.can_delete)
  const canEditFields = !isArchived && Boolean(caps.can_edit_fields)
  // Split contact flags — do not use legacy can_edit_party_contacts for parties
  const canViewCompanies = caps.can_view_companies === true
  const canEditPartyAContacts = caps.can_edit_party_a_contacts === true
  const canEditPartyBContacts = caps.can_edit_party_b_contacts === true

  const openFieldsEditor = () => setFieldsEditorOpen(true)

  const openContactsEditor = (sides) => {
    setContactsEditSides(sides)
    setContactsEditorOpen(true)
  }

  /** Staff (both flags): edit both sides. Party A/B: only their own side in PATCH. */
  const openContactsEditorForCard = (side) => {
    if (canEditPartyAContacts && canEditPartyBContacts) {
      openContactsEditor('both')
      return
    }
    openContactsEditor(side)
  }

  const bumpChangeLogs = () => setChangeLogRefreshKey((k) => k + 1)

  const refetchProgress = useCallback(async () => {
    if (!id) return
    const actRes = await activitiesApi.getProposalActivities(id)
    setProgress(normalizeProgressListResponse(actRes))
  }, [id])

  const refetchProposal = useCallback(async () => {
    if (!id) return null
    const refreshed = await proposalsApi.getProposalById(id)
    setProposal(refreshed)
    return refreshed
  }, [id])

  const handleFieldsSaved = async (res) => {
    if (res?.proposal || res?.capabilities) {
      setProposal((prev) => mergeProposalAfterFieldsPatch(prev, res))
    }
    const existingNotices = getExistingAccountNotices(res?.party_a, res?.party_b)
    setSuccess(
      [res?.message || 'Proposal fields updated successfully', ...existingNotices]
        .filter(Boolean)
        .join(' · '),
    )
    enqueueCredentialPrompts(buildCredentialPrompts(res?.party_a, res?.party_b))
    bumpChangeLogs()
    try {
      // Refetch full proposal so Progress / SIFC / Location stay server-truth after partial PATCH
      await Promise.all([refetchProgress(), refetchProposal()])
    } catch {
      // non-blocking — main save already succeeded
    }
  }

  const handleArchiveProposal = async () => {
    setActionLoading(true)
    setError('')
    try {
      const res = await proposalsApi.archiveProposal(id, archiveReason)
      setArchiveModalOpen(false)
      setArchiveReason('')
      navigate(dashboardPath, {
        state: { success: res?.message || 'MOU archived successfully' },
      })
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeleteProposal = async () => {
    setActionLoading(true)
    setError('')
    try {
      const res = await proposalsApi.deleteProposal(id)
      setDeleteModalOpen(false)
      navigate(dashboardPath, {
        state: { success: res?.message || 'Proposal deleted' },
      })
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setActionLoading(false)
    }
  }

  const handleRestoreProposal = async () => {
    setActionLoading(true)
    setError('')
    try {
      const res = await proposalsApi.restoreProposal(id)
      if (res?.proposal) {
        setProposal((prev) => ({
          ...prev,
          ...res.proposal,
          capabilities: res.capabilities || prev?.capabilities,
        }))
      } else {
        await refetchProposal()
      }
      setRestoreModalOpen(false)
      setSuccess(res?.message || 'MOU restored')
      bumpChangeLogs()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setActionLoading(false)
    }
  }

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
    if (tab === 'updates') return 'updates'
    if (tab === 'progress' || tab === 'activities') return 'progress'
    if (tab === 'history') return 'history'
    if (tab === 'companies' && canViewCompanies) return 'companies'
    return 'details'
  }, [searchParams, canChat, canMou, canViewCompanies])

  const setTab = (tab) => {
    if (tab === 'chat' && canChat) {
      setSearchParams({ tab: 'chat' }, { replace: true })
    } else if (tab === 'mou' && canMou) {
      setSearchParams({ tab: 'mou' }, { replace: true })
    } else if (tab === 'updates') {
      setSearchParams({ tab: 'updates' }, { replace: true })
    } else if (tab === 'progress') {
      setSearchParams({ tab: 'progress' }, { replace: true })
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
      setProgress(normalizeProgressListResponse(actRes))

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
    if (
      location.state?.respondToPoke &&
      proposal?.poke_status?.status === 'pending_response' &&
      isPartyA
    ) {
      setSearchParams({ tab: 'updates' }, { replace: true })
      setRespondMode(true)
      setRespondPokeActivityId(
        location.state?.pokeActivityId || proposal.poke_status?.poke_activity_id || null
      )
      setShowAddActivity(true)
      window.history.replaceState({}, '')
    }
  }, [location.state, proposal, isPartyA, setSearchParams])

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

  const handlePreviewSifcReport = async () => {
    if (!proposal?.id) return
    setSifcPreviewLoading(true)
    setError('')
    try {
      const report = await proposalsApi.getProposalSifcReport(proposal.id)
      setSifcPreview(report)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSifcPreviewLoading(false)
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

  const handleRequestUpdate = async () => {
    setActionLoading(true)
    setError('')
    setSuccess('')
    try {
      const res = await activitiesApi.pokeForUpdate(id)
      await refetchProposal()
      setSuccess(res?.message || 'Update requested — Party A has been notified')
      setTab('updates')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setActionLoading(false)
    }
  }

  const handleDismissUpdateRequest = async (activityId) => {
    if (!activityId) return
    setActionLoading(true)
    setError('')
    try {
      await activitiesApi.dismissUpdateRequest(activityId)
      setSuccess('Update request dismissed')
      await refetchProposal()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setActionLoading(false)
    }
  }

  const handleEditUpdateResponseSave = async (form) => {
    const activityId = proposal?.poke_status?.poke_activity_id
    if (!activityId) return
    setActionLoading(true)
    setError('')
    try {
      await activitiesApi.patchPokeResponse(activityId, {
        activity_date: form.activity_date,
        title: form.title.trim(),
        description: form.description.trim(),
        support_file_url: form.support_file_url || undefined,
      })
      setUpdateResponseEditOpen(false)
      setSuccess('Party A update saved')
      await refetchProposal()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setActionLoading(false)
    }
  }

  const handlePromoteToProgress = async () => {
    if (!promoteTargetId) return
    setActionLoading(true)
    setError('')
    try {
      const res = await activitiesApi.promoteUpdateToProgress(promoteTargetId, promoteComment)
      setPromoteTargetId(null)
      setPromoteComment('')
      setSuccess(res?.message || 'Party A update moved to Progress')
      await refreshProgressAndProposal()
      bumpChangeLogs()
      setTab('progress')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setActionLoading(false)
    }
  }

  const refreshProgressAndProposal = useCallback(async () => {
    await Promise.all([refetchProgress(), refetchProposal()])
  }, [refetchProgress, refetchProposal])

  const applyMouFieldsSync = useCallback((mouFields) => {
    if (!mouFields || typeof mouFields !== 'object' || !Object.keys(mouFields).length) {
      return false
    }
    setProposal((prev) => {
      if (!prev) return prev
      const es = parseExecutiveSummary(prev)
      return {
        ...prev,
        executive_summary: {
          ...es,
          ...mouFields,
        },
      }
    })
    return true
  }, [])

  const handleAddActivity = async () => {
    if (!activityForm.title.trim()) return
    setActionLoading(true)
    setError('')
    const isPokeResponse = respondMode && respondPokeActivityId
    try {
      const workDone = activityForm.description.trim()
      const payload = {
        activity_date: activityForm.activity_date,
        title: activityForm.title.trim(),
        description: workDone || undefined,
        what_was_done: workDone || undefined,
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
          ? 'Update response saved — waiting for Sector Lead review'
          : 'Progress update recorded — MOU Details updated',
      )
      if (isPokeResponse) {
        await refetchProposal()
        setTab('updates')
      } else {
        await refreshProgressAndProposal()
      }
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setActionLoading(false)
    }
  }

  const handleEditProgressSave = async (form) => {
    if (!progressEditTarget?.id) return
    setActionLoading(true)
    setError('')
    try {
      const workDone = form.description.trim()
      const res = await activitiesApi.updateActivity(progressEditTarget.id, {
        activity_date: form.activity_date,
        title: form.title.trim(),
        description: workDone || undefined,
        what_was_done: workDone || undefined,
        support_file_url: form.support_file_url || undefined,
      })
      setProgressEditTarget(null)
      setSuccess(
        res?.mou_sync?.synced
          ? 'Progress saved — MOU Details updated'
          : 'Progress update saved',
      )
      await refreshProgressAndProposal()
      bumpChangeLogs()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeleteProgress = async () => {
    if (!progressDeleteTarget?.id) return
    setActionLoading(true)
    setError('')
    try {
      const res = await activitiesApi.deleteActivity(progressDeleteTarget.id)
      setProgressDeleteTarget(null)
      const synced = applyMouFieldsSync(res?.mou_sync?.mou_fields)
      setSuccess(
        synced || res?.mou_sync?.synced
          ? 'Progress entry deleted — MOU Details updated'
          : 'Progress entry deleted',
      )
      if (synced) {
        await refetchProgress()
      } else {
        await refreshProgressAndProposal()
      }
      bumpChangeLogs()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setActionLoading(false)
    }
  }

  const handleRequestUnlock = async () => {
    if (!unlockRequestTarget?.id) return
    setActionLoading(true)
    setError('')
    try {
      await activitiesApi.requestEditUnlock(unlockRequestTarget.id, unlockNote.trim())
      setUnlockRequestTarget(null)
      setUnlockNote('')
      setSuccess('Edit access requested — waiting for Super Admin approval')
      await refetchProgress()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setActionLoading(false)
    }
  }

  const handleGrantUnlock = async (update) => {
    if (!update?.id) return
    setActionLoading(true)
    setError('')
    try {
      await activitiesApi.grantEditUnlock(update.id)
      setSuccess('Edit access granted')
      await refetchProgress()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setActionLoading(false)
    }
  }

  const handleAddProgressComment = async () => {
    if (!progressCommentTarget?.id || !progressCommentText.trim()) return
    setActionLoading(true)
    setError('')
    try {
      await activitiesApi.addActivityComment(progressCommentTarget.id, progressCommentText.trim())
      setProgressCommentTarget(null)
      setProgressCommentText('')
      setSuccess('Comment added')
      await refetchProgress()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setActionLoading(false)
    }
  }

  const canCommentOnProgress =
    !isRfpEngagement &&
    !isDealClosed &&
    (proposal?.capabilities?.can_comment === true ||
      ((canReview || isAdminRole || isPowerAdmin) &&
        proposal?.capabilities?.can_comment !== false))

  const pendingPokeActivityId = useMemo(() => {
    if (proposal?.poke_status?.status !== 'pending_response') return null
    if (proposal.poke_status.poke_activity_id) return proposal.poke_status.poke_activity_id
    for (let i = progress.updates.length - 1; i >= 0; i--) {
      if (progress.updates[i].can_respond) return progress.updates[i].id
    }
    return null
  }, [progress.updates, proposal?.poke_status])

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
  const canTrackProgress = proposal.status !== 'draft'
  const canWriteProgress =
    canTrackProgress &&
    !isRfpEngagement &&
    !isDealClosed &&
    !isArchived &&
    resolveCanAddProgress(
      progress.canAddProgress,
      proposal.capabilities?.can_add_activity,
    )
  const canViewUpdates =
    canTrackProgress &&
    !isRfpEngagement &&
    !isDealClosed &&
    !isArchived &&
    (isPartyA || canReview || isAdminRole || isPowerAdmin)
  const updateRequestStatus =
    proposal?.poke_status?.status || proposal?.capabilities?.update_request_status || 'none'
  const hasActiveUpdateRequest =
    updateRequestStatus && updateRequestStatus !== 'none'
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
          {canExportReport && (
            <>
              <ProposalExportMenu proposalId={proposal?.id} onError={setError} />
              <button
                type="button"
                onClick={handlePreviewSifcReport}
                disabled={sifcPreviewLoading}
                className="inline-flex items-center gap-2 rounded-lg border border-green-700/30 bg-green-50 px-4 py-2 text-sm font-semibold text-green-900 shadow-sm hover:bg-green-100 disabled:opacity-60"
              >
                {sifcPreviewLoading ? 'Loading…' : 'Preview SIFC report'}
              </button>
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
          {canWriteProgress && (
            <button
              type="button"
              onClick={() => openActivityModal(false)}
              className="inline-flex items-center gap-2 rounded-lg bg-portal-primary px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:bg-green-400"
            >
              + Add Progress Update
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
          {canRestoreProposal && (
            <button
              type="button"
              onClick={() => setRestoreModalOpen(true)}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 rounded-lg border border-green-700/30 bg-green-50 px-4 py-2 text-sm font-semibold text-green-900 shadow-sm hover:bg-green-100 disabled:opacity-60"
            >
              Restore MOU
            </button>
          )}
          {canArchiveProposal && (
            <button
              type="button"
              onClick={() => setArchiveModalOpen(true)}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-800 shadow-sm hover:bg-red-100 disabled:opacity-60"
            >
              Archive MOU
            </button>
          )}
          {canDeleteProposal && (
            <button
              type="button"
              onClick={() => setDeleteModalOpen(true)}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 shadow-sm hover:bg-red-50 disabled:opacity-60"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      {isArchived && (
        <div className="rounded-lg border border-slate-300 bg-slate-100 px-4 py-3 text-sm text-slate-800">
          <p className="font-semibold">This MOU is archived</p>
          <p className="mt-1 text-slate-600">
            Archived MOUs are hidden from Sector Leads and parties. Super Admin can view and restore.
          </p>
          {(proposal.archived_reason || proposal.archived_at) && (
            <p className="mt-2 text-xs text-slate-500">
              {proposal.archived_reason && (
                <span>
                  Reason:{' '}
                  <span className="font-medium text-slate-700">{proposal.archived_reason}</span>
                </span>
              )}
              {proposal.archived_reason && proposal.archived_at ? ' · ' : ''}
              {proposal.archived_at && <span>Archived {formatDate(proposal.archived_at)}</span>}
            </p>
          )}
        </div>
      )}

      {isRfpEngagement && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          <strong>Read-only engagement view</strong> — China RFP can monitor chat and progress updates.
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
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              {isArchived && (
                <span className="rounded-full bg-slate-500/80 px-2.5 py-0.5 text-[11px] font-semibold text-white ring-1 ring-white/20">
                  Archived
                </span>
              )}
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
          <div className="bg-white/5 px-6 py-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Progress</p>
            <div className="mt-1">
              {canTrackProgress ? (
                <MouProgressValue value={getMouConferenceRow(proposal).progress} variant="hero" />
              ) : (
                <p className="text-sm font-semibold text-white">—</p>
              )}
            </div>
          </div>
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
        {canViewUpdates && (
          <DetailTabButton active={activeTab === 'updates'} onClick={() => setTab('updates')}>
            <span className="inline-flex items-center gap-1.5">
              Updates
              {hasActiveUpdateRequest && (
                <span
                  className={`h-2 w-2 rounded-full ${
                    updateRequestStatus === 'awaiting_review' ? 'bg-blue-500' : 'bg-amber-500'
                  }`}
                  aria-hidden
                />
              )}
            </span>
          </DetailTabButton>
        )}
        {canTrackProgress && (
          <DetailTabButton active={activeTab === 'progress'} onClick={() => setTab('progress')}>
            Progress
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
              canEditPartyAContacts={canEditPartyAContacts}
              canEditPartyBContacts={canEditPartyBContacts}
              onEditPartyAContacts={() => openContactsEditorForCard('a')}
              onEditPartyBContacts={() => openContactsEditorForCard('b')}
            />
          )}
        </div>
      ) : activeTab === 'mou' ? (
        <div className="space-y-6">
          <MmMouPanel
          matchId={isMatchmakingMou ? mmMatch?.id : undefined}
          proposalId={isDirectMou ? id : undefined}
          proposal={proposal}
          canEdit={canEditMou}
          canUploadMou={canUploadMou}
          canEditMouFields={canEditMouFields}
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
      ) : activeTab === 'updates' ? (
        <ProposalUpdateRequestsPanel
          proposal={proposal}
          actionLoading={actionLoading}
          showStaffRequestHint={canReview || isAdminRole}
          staffCanManageUpdates={canReview || isAdminRole}
          mouAdminCanRequest={isMouAdmin}
          onRequestUpdate={handleRequestUpdate}
          onRespond={() =>
            openActivityModal(
              true,
              proposal.poke_status?.poke_activity_id || pendingPokeActivityId,
            )
          }
          onEditResponse={() => setUpdateResponseEditOpen(true)}
          onPromote={(activityId) => setPromoteTargetId(activityId)}
          onDismiss={handleDismissUpdateRequest}
          onOpenFile={(url, title) => setFilePreview({ url, title })}
        />
      ) : activeTab === 'progress' ? (
        <ProposalProgressPanel
          proposalId={canTrackProgress ? proposal.id : undefined}
          proposalLabel={getProposalDisplayTitle(proposal)}
          rows={progress.rows}
          columns={progress.columns}
          updates={progress.updates}
          count={progress.count}
          actionLoading={actionLoading}
          onOpenFile={(url, title) => setFilePreview({ url, title })}
          isPartyA={isPartyA}
          pokeActivityId={pendingPokeActivityId}
          onRespondToPoke={(activityId) => openActivityModal(true, activityId)}
          onEdit={(update) => setProgressEditTarget(update)}
          onDelete={(update) => setProgressDeleteTarget(update)}
          onComment={(update) => {
            setProgressCommentTarget(update)
            setProgressCommentText('')
          }}
          canComment={canCommentOnProgress}
          onRequestUnlock={(update) => {
            setUnlockRequestTarget(update)
            setUnlockNote('')
          }}
          onGrantUnlock={handleGrantUnlock}
        />
      ) : (
        <>
          <ProposalDetailPanel
            proposal={proposal}
            conferences={conferences}
            onEditFields={canEditFields ? openFieldsEditor : undefined}
            onOpenFile={(url, title) => setFilePreview({ url, title })}
          />
        </>
      )}

      <Modal
        open={showAddActivity}
        title={respondMode ? 'Respond to Update Request' : 'Add Progress Update'}
        onClose={closeActivityModal}
        onConfirm={handleAddActivity}
        confirmLabel={respondMode ? 'Submit Response' : 'Submit Update'}
        loading={actionLoading || activityUploading}
        confirmDisabled={
          !activityForm.title.trim() ||
          !activityForm.description.trim() ||
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

      <ProposalSifcReportPreviewModal
        open={Boolean(sifcPreview)}
        report={sifcPreview}
        proposalId={proposal?.id}
        proposalLabel={getProposalDisplayTitle(proposal)}
        onClose={() => setSifcPreview(null)}
        onError={setError}
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
        editSides={contactsEditSides}
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

      <ProposalUpdateResponseEditModal
        open={updateResponseEditOpen}
        initial={proposal?.poke_status?.party_a_response}
        loading={actionLoading}
        onClose={() => setUpdateResponseEditOpen(false)}
        onSave={handleEditUpdateResponseSave}
      />

      <Modal
        open={Boolean(promoteTargetId)}
        title="Add to Progress"
        onClose={() => {
          setPromoteTargetId(null)
          setPromoteComment('')
        }}
        onConfirm={handlePromoteToProgress}
        confirmLabel="Add to Progress"
        loading={actionLoading}
      >
        <p className="mb-3 text-sm text-slate-600">
          Move Party A&apos;s update to the Progress tab and update MOU Details → Progress.
        </p>
        <textarea
          rows={2}
          value={promoteComment}
          onChange={(e) => setPromoteComment(e.target.value)}
          placeholder="Optional note for the record…"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
      </Modal>

      <ProposalProgressEditModal
        open={Boolean(progressEditTarget)}
        initial={progressEditTarget}
        loading={actionLoading}
        onClose={() => setProgressEditTarget(null)}
        onSave={handleEditProgressSave}
      />

      <Modal
        open={Boolean(progressDeleteTarget)}
        title="Delete progress entry"
        onClose={() => setProgressDeleteTarget(null)}
        onConfirm={handleDeleteProgress}
        confirmLabel="Delete"
        confirmVariant="danger"
        loading={actionLoading}
      >
        <p className="text-sm text-slate-600">
          Delete <strong>{progressDeleteTarget?.title}</strong>? This cannot be undone.
        </p>
      </Modal>

      <Modal
        open={Boolean(progressCommentTarget)}
        title="Add comment"
        onClose={() => {
          setProgressCommentTarget(null)
          setProgressCommentText('')
        }}
        onConfirm={handleAddProgressComment}
        confirmLabel="Post comment"
        loading={actionLoading}
        confirmDisabled={!progressCommentText.trim()}
      >
        <p className="mb-3 text-sm text-slate-600">
          Comment on <strong>{progressCommentTarget?.title}</strong>. Multiple comments are
          allowed — they appear in the Comments column and expanded thread.
        </p>
        {isMouAdmin && progressCommentTarget?.added_by_role === 'sector_lead' && (
          <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Super Admin comments on Sector Lead progress lock the row until you grant edit access.
          </p>
        )}
        <textarea
          rows={3}
          value={progressCommentText}
          onChange={(e) => setProgressCommentText(e.target.value)}
          placeholder="e.g. Please update bottleneck details"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
      </Modal>

      <Modal
        open={Boolean(unlockRequestTarget)}
        title="Request edit access"
        onClose={() => {
          setUnlockRequestTarget(null)
          setUnlockNote('')
        }}
        onConfirm={handleRequestUnlock}
        confirmLabel="Send request"
        loading={actionLoading}
      >
        <p className="mb-3 text-sm text-slate-600">
          This row is locked after a Super Admin comment. Add an optional note for the unlock
          request.
        </p>
        <textarea
          rows={3}
          value={unlockNote}
          onChange={(e) => setUnlockNote(e.target.value)}
          placeholder="Please allow me to fix the progress description…"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
      </Modal>

      <Modal
        open={deleteModalOpen}
        title="Delete proposal?"
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteProposal}
        confirmLabel="Delete"
        confirmVariant="danger"
        loading={actionLoading}
      >
        <p className="text-sm text-slate-600">
          Permanently delete <strong>{getProposalDisplayTitle(proposal)}</strong>
          {proposal?.status === 'rejected' ? ' (rejected)' : ' (draft)'}? This cannot be undone.
        </p>
      </Modal>

      <Modal
        open={archiveModalOpen}
        title="Archive MOU"
        onClose={() => {
          setArchiveModalOpen(false)
          setArchiveReason('')
        }}
        onConfirm={handleArchiveProposal}
        confirmLabel="Archive MOU"
        confirmVariant="danger"
        loading={actionLoading}
      >
        <p className="text-sm text-slate-600">
          Archive <strong>{getProposalDisplayTitle(proposal)}</strong>? The record stays in the
          database but is hidden from Sector Leads and parties.
        </p>
        <label className="mt-4 block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Reason (optional)
          </span>
          <input
            type="text"
            value={archiveReason}
            onChange={(e) => setArchiveReason(e.target.value)}
            placeholder="e.g. Duplicate"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-portal-primary focus:ring-2 focus:ring-portal-primary/30"
          />
        </label>
      </Modal>

      <Modal
        open={restoreModalOpen}
        title="Restore MOU"
        onClose={() => setRestoreModalOpen(false)}
        onConfirm={handleRestoreProposal}
        confirmLabel="Restore MOU"
        loading={actionLoading}
      >
        <p className="text-sm text-slate-600">
          Restore <strong>{getProposalDisplayTitle(proposal)}</strong>? It will reappear for the
          assigned Sector Lead and parties.
        </p>
      </Modal>

      <PartyBCredentialsModal
        open={Boolean(credentialModal)}
        title={credentialModal?.title}
        credentials={credentialModal?.credentials}
        subtitle={credentialModal?.subtitle}
        side={credentialModal?.side || 'B'}
        onClose={closeCredentialModal}
      />
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
