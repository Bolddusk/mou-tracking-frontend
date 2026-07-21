import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import * as mmApi from '../../api/matchmaking'
import * as proposalsApi from '../../api/proposals'
import * as conferencesApi from '../../api/conferences'
import * as ministriesApi from '../../api/ministries'
import * as sifcApi from '../../api/sifcCategories'
import Alert from '../../components/Alert'
import FinancialsEditor from '../../components/proposal/FinancialsEditor'
import LoadingSpinner from '../../components/LoadingSpinner'
import Modal from '../../components/Modal'
import OnBehalfOwnerPicker from '../../components/matchmaking/OnBehalfOwnerPicker'
import {
  EMPTY_PROPOSAL_FORM,
  ENGAGEMENT_TYPES,
  ENTITY_TYPES,
  PROPOSAL_STEPS,
  TOTAL_STEPS,
  fundUtilizationTotal,
  suggestedEntityTypes,
} from '../../constants/proposalTemplate'
import {
  MM_PROPOSAL_STEPS,
  MM_SIDES,
  MM_TOTAL_STEPS,
  defaultSideForRole,
  mmContentStep,
} from '../../constants/matchmaking'
import { useAuth } from '../../context/AuthContext'
import { useSectors } from '../../context/SectorsContext'
import { getErrorMessage, toDateInputValue } from '../../utils/format'
import * as mmDraft from '../../utils/mmProposalDraft'
import { EMPTY_MM_PROPOSAL_FORM } from '../../utils/mmProposalDraft'
import * as draft from '../../utils/proposalDraft'

export default function NewProposal({ variant = 'legacy' }) {
  const isMm = variant === 'matchmaking'
  const formSteps = isMm ? MM_PROPOSAL_STEPS : PROPOSAL_STEPS
  const maxStep = isMm ? MM_TOTAL_STEPS : TOTAL_STEPS
  const emptyForm = isMm ? EMPTY_MM_PROPOSAL_FORM : EMPTY_PROPOSAL_FORM

  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, isSuperAdmin, isPowerAdmin, isPartyA, isInvestor, ministryId, ministry, dashboardPath: authDashboardPath } =
    useAuth()
  /** Direct MOU create — Power Admin same flow as Super Admin */
  const isDirectStaffAdmin = isSuperAdmin || isPowerAdmin
  const { sectors } = useSectors()
  const editProposalId = searchParams.get('edit')
  const initialStepParam = searchParams.get('step')

  const dashboardPath = useMemo(() => {
    if (isMm) {
      return isSuperAdmin ? '/matchmaking/admin/my-proposals' : '/matchmaking/my-proposals'
    }
    if (isDirectStaffAdmin) return '/dashboard/super-admin'
    return authDashboardPath || '/dashboard/party-a'
  }, [isMm, isSuperAdmin, isDirectStaffAdmin, authDashboardPath])

  const initial = useMemo(() => {
    if (isMm) return mmDraft.loadFormState()
    if (isDirectStaffAdmin && !editProposalId) {
      return {
        form: { ...EMPTY_PROPOSAL_FORM },
        step: 1,
        proposalId: null,
        completedSteps: new Set(),
      }
    }
    return draft.loadFormState()
  }, [isMm, isDirectStaffAdmin, editProposalId])

  const [step, setStep] = useState(initial.step)
  const [form, setForm] = useState(initial.form)
  const [proposalId, setProposalId] = useState(initial.proposalId)
  const [completedSteps, setCompletedSteps] = useState(initial.completedSteps)
  const [loading, setLoading] = useState(false)
  const [loadingProposal, setLoadingProposal] = useState(false)
  const [savingDraft, setSavingDraft] = useState(false)
  const [uploading, setUploading] = useState('')
  const [error, setError] = useState('')
  const [draftSavedMsg, setDraftSavedMsg] = useState('')
  const [fieldErrors, setFieldErrors] = useState([])
  const [successInfo, setSuccessInfo] = useState(null)
  const [resubmitConfirmOpen, setResubmitConfirmOpen] = useState(false)
  const [proposalStatus, setProposalStatus] = useState(null)
  const [sectorLeadComment, setSectorLeadComment] = useState('')
  const [onBehalfUserId, setOnBehalfUserId] = useState(() =>
    isMm && isSuperAdmin ? mmDraft.loadOnBehalfId() : null,
  )
  const [onBehalfUserLabel, setOnBehalfUserLabel] = useState(() =>
    isMm && isSuperAdmin ? mmDraft.loadOnBehalfLabel() : '',
  )
  const [showOwnerPicker, setShowOwnerPicker] = useState(
    isMm && isSuperAdmin && !initial.proposalId && !editProposalId && !mmDraft.loadOnBehalfId(),
  )
  const [conferences, setConferences] = useState([])
  const [ministries, setMinistries] = useState([])
  const [sifcCategories, setSifcCategories] = useState([])
  const [alignmentExpanded, setAlignmentExpanded] = useState(false)

  const isSideB = isMm && form.side === 'side_b'
  const contentStep = isMm ? mmContentStep(step) : step
  const orgSection = isMm ? 'submitter_info' : 'party_a_info'

  const isRejectedResubmit =
    !isMm && !isDirectStaffAdmin && proposalStatus === 'rejected'

  const ownerField = form.side === 'side_a' ? 'party_a_id' : 'investor_id'
  const ownerRole = form.side === 'side_a' ? 'party_a' : 'investor'

  useEffect(() => {
    if (isMm) mmDraft.persistFormState(form, step, proposalId)
    else draft.persistFormState(form, step, proposalId)
  }, [isMm, form, step, proposalId])

  useEffect(() => {
    const persist = isMm ? mmDraft.persistCompletedSteps : draft.persistCompletedSteps
    const load = isMm ? mmDraft.loadCompletedSteps : draft.loadCompletedSteps
    if (!proposalId) {
      persist(completedSteps, null)
      return
    }
    const sessionSteps = load(null)
    const merged = new Set([...sessionSteps, ...completedSteps])
    persist(merged, proposalId)
  }, [isMm, completedSteps, proposalId])

  useEffect(() => {
    if (!isDirectStaffAdmin) {
      if (ministryId) {
        setForm((f) => (f.ministry_id ? f : { ...f, ministry_id: String(ministryId) }))
      }
      return undefined
    }
    let cancelled = false
    ministriesApi
      .listMinistries()
      .then((res) => {
        if (cancelled) return
        const list = res.data || []
        setMinistries(list)
        setForm((f) => {
          if (f.ministry_id) return f
          const def = list.find((m) => String(m.code).toLowerCase() === 'mnfsr') || list[0]
          return def ? { ...f, ministry_id: String(def.id) } : f
        })
      })
      .catch(() => {
        if (!cancelled) setMinistries([])
      })
    return () => {
      cancelled = true
    }
  }, [isDirectStaffAdmin, ministryId])

  useEffect(() => {
    if (isMm) return
    let cancelled = false
    const confParams = form.ministry_id ? { ministry_id: form.ministry_id } : {}
    Promise.all([
      conferencesApi.getConferences(confParams),
      sifcApi.getSifcCategories(),
    ])
      .then(([confRes, sifcRes]) => {
        if (cancelled) return
        const confList = Array.isArray(confRes) ? confRes : confRes?.conferences || []
        const sifcList = Array.isArray(sifcRes)
          ? sifcRes
          : sifcRes?.categories || sifcRes?.data || []
        setConferences(confList.filter((c) => c.is_active !== false))
        setSifcCategories(sifcList.filter((c) => c.is_active !== false))
      })
      .catch(() => {
        if (!cancelled) {
          setConferences([])
          setSifcCategories([])
        }
      })
    return () => {
      cancelled = true
    }
  }, [isMm, form.ministry_id])

  useEffect(() => {
    if (!isMm || isSuperAdmin || !user?.role) return
    setForm((f) => ({ ...f, side: defaultSideForRole(user.role) }))
  }, [isMm, user?.role, isSuperAdmin])

  useEffect(() => {
    if (contentStep !== 5) return
    setForm((f) => {
      if (!f.sector?.trim()) return f
      const conferenceName = f.conference_info?.conference_name || ''
      const align = f.executive_summary?.sector_alignment?.trim()
      if (align) return f
      return {
        ...f,
        executive_summary: {
          ...f.executive_summary,
          sector_alignment: draft.defaultSectorAlignmentText(f.sector, conferenceName),
        },
      }
    })
  }, [contentStep])

  useEffect(() => {
    if (!isMm || !editProposalId) return
    let cancelled = false
    ;(async () => {
      setLoadingProposal(true)
      setError('')
      try {
        const prop = await mmApi.getMmProposalById(editProposalId)
        if (cancelled) return
        const loaded = mmDraft.loadDraftFromProposal(prop)
        const stepNum = initialStepParam ? Number(initialStepParam) : loaded.step
        setForm(loaded.form)
        setProposalId(loaded.proposalId)
        setCompletedSteps(loaded.completedSteps)
        setProposalStatus(prop.status || null)
        setStep(stepNum >= 1 && stepNum <= MM_TOTAL_STEPS ? stepNum : loaded.step)
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err))
      } finally {
        if (!cancelled) setLoadingProposal(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isMm, editProposalId, initialStepParam])

  useEffect(() => {
    if (isMm || !isDirectStaffAdmin || !editProposalId) return

    let cancelled = false
    ;(async () => {
      setLoadingProposal(true)
      setError('')
      try {
        const prop = await proposalsApi.getProposalById(editProposalId)
        if (cancelled) return
        const loaded = draft.loadDraftFromProposal(prop)
        const stepNum = initialStepParam ? Number(initialStepParam) : loaded.step
        setForm(loaded.form)
        setProposalId(loaded.proposalId)
        setCompletedSteps(loaded.completedSteps)
        setProposalStatus(prop.status || null)
        setSectorLeadComment(prop.sector_lead_comment || '')
        setStep(stepNum >= 1 && stepNum <= TOTAL_STEPS ? stepNum : loaded.step)
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err))
      } finally {
        if (!cancelled) setLoadingProposal(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [isDirectStaffAdmin, editProposalId, initialStepParam])

  useEffect(() => {
    if (isMm || isDirectStaffAdmin) return
    if (!proposalId) {
      setProposalStatus(null)
      setSectorLeadComment('')
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        const prop = await proposalsApi.getProposalById(proposalId)
        if (cancelled) return
        setProposalStatus(prop.status || null)
        setSectorLeadComment(prop.sector_lead_comment || '')
      } catch {
        if (!cancelled) {
          setProposalStatus(null)
          setSectorLeadComment('')
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [proposalId, isMm, isDirectStaffAdmin])

  useEffect(() => {
    if (!user || isDirectStaffAdmin) return
    if (isMm) {
      setForm((f) => {
        const si = f.submitter_info || {}
        if (si.contact_name && si.email) return f
        return {
          ...f,
          submitter_info: {
            ...si,
            contact_name: si.contact_name || user.full_name || '',
            email: si.email || user.email || '',
            phone: si.phone || user.phone || '',
            organization_name: si.organization_name || user.organization || '',
            country: si.country || f.country || '',
          },
        }
      })
      return
    }
    setForm((f) => {
      const pa = f.party_a_info || {}
      if (pa.contact_name && pa.email) return f
      return {
        ...f,
        party_a_info: {
          ...pa,
          contact_name: pa.contact_name || user.full_name || '',
          email: pa.email || user.email || '',
          phone: pa.phone || user.phone || '',
          organization_name: pa.organization_name || user.organization || '',
        },
      }
    })
  }, [user, isDirectStaffAdmin, isMm])

  const applyEngagementType = (value) => {
    const suggested = suggestedEntityTypes(value)
    setForm((f) => {
      const next = {
        ...f,
        engagement_type: value,
        party_b_entity_type: suggested.partyB,
      }
      if (isMm) {
        next.submitter_info = {
          ...f.submitter_info,
          entity_type: suggested.partyA,
        }
      } else {
        next.party_a_info = {
          ...f.party_a_info,
          entity_type: suggested.partyA,
        }
      }
      return next
    })
  }

  const applyConferenceSelection = (e) => {
    const key = e.target.value
    if (!key) {
      setForm((f) => ({ ...f, conference_key: '' }))
      return
    }
    const conf = conferences.find((c) => (c.key || c.conference_key) === key)
    setForm((f) => {
      if (!conf) return { ...f, conference_key: key }
      const engagement = conf.engagement_type ? String(conf.engagement_type).toUpperCase() : ''
      const prevConferenceName = f.conference_info?.conference_name || ''
      const conferenceName = conf.name || f.conference_info.conference_name
      const next = {
        ...f,
        conference_key: key,
        engagement_type: f.engagement_type || engagement,
        conference_info: {
          ...f.conference_info,
          conference_name: conferenceName,
          conference_date:
            toDateInputValue(conf.conference_date) || f.conference_info.conference_date,
          conference_end_date:
            toDateInputValue(conf.conference_end_date) || f.conference_info.conference_end_date,
          conference_location: conf.location || f.conference_info.conference_location,
          conference_host: conf.host || f.conference_info.conference_host,
          conference_description: conf.description || f.conference_info.conference_description,
        },
      }
      if (
        f.sector &&
        draft.isAutoSectorAlignment(
          f.executive_summary?.sector_alignment,
          f.sector,
          prevConferenceName,
        )
      ) {
        next.executive_summary = {
          ...f.executive_summary,
          sector_alignment: draft.defaultSectorAlignmentText(f.sector, conferenceName),
        }
      }
      return next
    })
  }

  const applySectorSelection = (e) => {
    const sector = e.target.value
    setForm((f) => {
      const conferenceName = f.conference_info?.conference_name || ''
      const shouldAutoFill = draft.isAutoSectorAlignment(
        f.executive_summary?.sector_alignment,
        f.sector,
        conferenceName,
      )
      return {
        ...f,
        sector,
        mou_sector: sector,
        executive_summary: {
          ...f.executive_summary,
          sector_alignment: shouldAutoFill
            ? draft.defaultSectorAlignmentText(sector, conferenceName)
            : f.executive_summary.sector_alignment,
        },
      }
    })
  }

  const applySifcCategory = (e) => {
    const value = e.target.value
    setForm((f) => ({
      ...f,
      sifc_category: value,
      executive_summary: { ...f.executive_summary, sifc_category: value },
    }))
  }

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const setNested = (section, key) => (e) =>
    setForm((f) => ({
      ...f,
      [section]: { ...f[section], [key]: e.target.value },
    }))

  const saveDraft = async () => {
    if (isMm) {
      const payload = mmDraft.formToPayload(form, proposalId, {
        ownerId: isSuperAdmin && !proposalId ? onBehalfUserId : undefined,
        ownerField: isSuperAdmin && !proposalId ? ownerField : undefined,
      })
      const result = await mmApi.saveMmProposalDraft(payload)
      const id = result.proposal_id ?? result.id
      if (result.created_on_behalf_of) {
        setOnBehalfUserLabel(result.created_on_behalf_of)
        mmDraft.persistOnBehalf(onBehalfUserId, result.created_on_behalf_of)
      }
      setProposalId(id)
      mmDraft.persistFormState(form, step, id)
      return id
    }
    const payload = draft.proposalToFormPayload(form, proposalId)
    const result = await proposalsApi.saveDraft(payload)
    const id = result.proposal_id
    setProposalId(id)
    try {
      const prop = await proposalsApi.getProposalById(id)
      const hydrated = draft.hydrateDraftFormFromProposal(prop)
      setForm(hydrated)
      draft.persistFormState(hydrated, step, id)
    } catch {
      draft.persistFormState(form, step, id)
    }
    return id
  }

  const handleUpload = async (e, fieldName, urlKey) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(urlKey)
    setError('')
    try {
      const uploadApi = isMm ? mmApi.uploadMmProposalFile : proposalsApi.uploadFile
      const { file_url } = await uploadApi(file, fieldName)
      setForm((f) => {
        const next = { ...f, [urlKey]: file_url }
        if (isMm && (urlKey === 'proposal_file_url' || urlKey === 'file_url')) {
          next.proposal_file_url = file_url
          next.file_url = file_url
        }
        return next
      })
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setUploading('')
      e.target.value = ''
    }
  }

  const handleNext = async () => {
    setError('')
    setFieldErrors([])
    setLoading(true)
    try {
      const id = await saveDraft()
      setProposalId(id)
      setCompletedSteps((prev) => new Set([...prev, step]))
      setStep((s) => Math.min(maxStep, s + 1))
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => setStep((s) => Math.max(1, s - 1))

  const handleGoToStep = async (target) => {
    if (target === step || uploading) return
    if (isMm && !MM_PROPOSAL_STEPS.some((s) => s.num === target)) return
    setError('')
    setFieldErrors([])
    setStep(target)
    window.scrollTo({ top: 0, behavior: 'smooth' })
    // Only persist to server after the user has explicitly saved once (draft id exists).
    if (!proposalId) return
    try {
      await saveDraft()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const handleSaveDraftOnly = async () => {
    setError('')
    setFieldErrors([])
    setDraftSavedMsg('')
    setSavingDraft(true)
    try {
      const id = await saveDraft()
      setDraftSavedMsg(
        isRejectedResubmit
          ? `Changes saved · ID #${id}. Status remains rejected until you resubmit.`
          : `Draft saved · ID #${id}. Continue anytime from your dashboard.`,
      )
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSavingDraft(false)
    }
  }

  const handleSubmitClick = () => {
    if (isRejectedResubmit) {
      setResubmitConfirmOpen(true)
      return
    }
    handleSubmit()
  }

  const extractMissingFields = (err) => {
    const data = err?.response?.data
    return data?.fields || data?.missing_fields || []
  }

  const handleResubmit = async () => {
    if (!proposalId) return
    setError('')
    setFieldErrors([])
    setLoading(true)
    try {
      await saveDraft()
      const result = await proposalsApi.resubmitProposal(proposalId)
      draft.clearFormState(proposalId)
      setSuccessInfo({
        proposal_id: proposalId,
        message: result.message || 'Proposal resubmitted for sector lead review',
        isResubmit: true,
      })
    } catch (err) {
      const missing = extractMissingFields(err)
      if (missing.length) setFieldErrors(missing)
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
      setResubmitConfirmOpen(false)
    }
  }

  const handleSubmit = async () => {
    setError('')
    setFieldErrors([])
    if (!isMm && proposalStatus === 'rejected') {
      setError('Use Resubmit for Review to send this proposal back to Sector Lead.')
      return
    }
    setLoading(true)
    try {
      const id = await saveDraft()
      if (isMm) {
        const result = await mmApi.submitMmProposal(id)
        mmDraft.clearFormState(id)
        setSuccessInfo({
          proposal_id: id,
          message: result.message || 'Proposal submitted for review',
        })
      } else {
        const result = await proposalsApi.submitProposal(id)
        draft.clearFormState(id)
        setSuccessInfo(result)
      }
    } catch (err) {
      const missing = extractMissingFields(err)
      if (missing.length) setFieldErrors(missing)
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const handleStartFresh = () => {
    if (isMm) mmDraft.clearFormState(proposalId)
    else draft.clearFormState(proposalId)
    setForm({ ...emptyForm })
    setStep(1)
    setProposalId(null)
    setCompletedSteps(new Set())
    setError('')
    setFieldErrors([])
    if (isDirectStaffAdmin && !isMm) {
      navigate('/proposals/new', { replace: true })
    }
    if (isMm) {
      setOnBehalfUserId(null)
      setOnBehalfUserLabel('')
    }
  }

  const utilizationTotal = fundUtilizationTotal(form.investment_ask)
  const utilizationOk = utilizationTotal === 100

  if (showOwnerPicker) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 pb-8">
        <Link to={dashboardPath} className="text-sm font-medium text-green-700 hover:underline">
          ← My proposals
        </Link>
        <OnBehalfOwnerPicker
          role={ownerRole}
          title={`Create ${form.side === 'side_a' ? 'Side A' : 'Side B'} proposal on behalf of user`}
          description="Select the account that will own this proposal. Required on first draft save only."
          selectedId={onBehalfUserId}
          onSelect={(id, label) => {
            setOnBehalfUserId(id)
            if (label) setOnBehalfUserLabel(label)
          }}
          onContinue={() => {
            mmDraft.persistOnBehalf(onBehalfUserId, onBehalfUserLabel)
            setShowOwnerPicker(false)
          }}
        />
      </div>
    )
  }

  if (loadingProposal) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (successInfo) {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-green-200 bg-green-50 p-8 text-center">
        <h3 className="text-xl font-bold text-green-800">
          {successInfo.isResubmit ? 'Resubmitted successfully' : 'Submitted successfully'}
        </h3>
        <p className="mt-2 text-sm text-green-700">
          {isMm ? 'Proposal' : 'Opportunity'} ID: <strong>#{successInfo.proposal_id}</strong>
        </p>
        {successInfo.message && (
          <p className="mt-1 text-sm text-green-700">{successInfo.message}</p>
        )}
        <button
          type="button"
          onClick={() => navigate(dashboardPath)}
          className="mt-6 rounded-lg bg-portal-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-portal-primary-hover"
        >
          Go to Dashboard
        </button>
      </div>
    )
  }

  const currentStepMeta = formSteps.find((s) => s.num === step)
  const accentLink = 'text-green-700'

  return (
    <div className="-mx-4 w-[calc(100%+2rem)] pb-8 sm:-mx-6 sm:w-[calc(100%+3rem)]">
      {isMm && (
        <div className="mx-4 mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 sm:mx-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-green-800">
            Matchmaking Proposal
          </p>
          <p className="mt-1 text-sm text-green-900">
            Same business content as Direct MOUS — no Party B or MOU at submit. MOU comes after a
            match is created.
          </p>
        </div>
      )}

      {isDirectStaffAdmin && !isMm && (
        <div className="mx-4 mb-4 flex flex-col gap-4 border-b border-slate-100 pb-4 sm:mx-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              {isPowerAdmin ? 'Power Admin' : 'Super Admin'} — Direct Opportunities
            </p>
            <h3 className="mt-1 text-lg font-semibold text-slate-800">MOUS</h3>
            <p className="mt-1 text-sm text-slate-500">
              {editProposalId
                ? `Editing opportunity #${editProposalId} — complete MOU details on Step 11.`
                : 'Same 11-step form as Party A — create a new Direct Opportunity here.'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleStartFresh}
            className="inline-flex shrink-0 items-center justify-center rounded-lg bg-portal-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-portal-primary-hover"
          >
            Add MOUS
          </button>
        </div>
      )}

      {isSuperAdmin && isMm && onBehalfUserLabel && (
        <div className="mx-4 mb-4 rounded-xl border border-green-300 bg-green-50 px-4 py-3 sm:mx-6">
          <p className="text-sm text-green-900">
            <strong>Super Admin</strong> — creating on behalf of <strong>{onBehalfUserLabel}</strong>
          </p>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-4 sm:mb-5 sm:px-6">
        <Link to={dashboardPath} className={`text-sm font-medium hover:underline ${accentLink}`}>
          ← Back to dashboard
        </Link>
        <div className="flex items-center gap-4 text-xs text-slate-500">
          {proposalId && (
            <span>
              {isMm
                ? `Draft #${proposalId}`
                : `${isRejectedResubmit ? 'Rejected' : proposalStatus === 'draft' ? 'Draft' : 'Opportunity'} #${proposalId}`}
            </span>
          )}
          {proposalId && !isRejectedResubmit && (
            <button
              type="button"
              onClick={handleStartFresh}
              className="font-medium text-slate-500 hover:text-slate-700"
            >
              Start fresh
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4 px-4 sm:px-6 lg:flex-row lg:items-start lg:gap-6">
        <aside className="hidden shrink-0 lg:block lg:w-56 xl:w-60">
          <StepSidebar
            current={step}
            completedSteps={completedSteps}
            steps={formSteps}
            onStepClick={handleGoToStep}
          />
        </aside>

        <div className="min-w-0 flex-1 space-y-4 sm:space-y-5">
          <MobileStepProgress
            current={step}
            label={currentStepMeta?.label}
            steps={formSteps}
            onStepClick={handleGoToStep}
          />

        <Alert type="error" message={error} onClose={() => setError('')} />
          <Alert type="success" message={draftSavedMsg} onClose={() => setDraftSavedMsg('')} />

          {isRejectedResubmit && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-900">
              <p className="font-semibold">Rejected by Sector Lead</p>
              {sectorLeadComment ? (
                <p className="mt-2 whitespace-pre-wrap rounded-lg border border-red-100 bg-white/60 px-3 py-2 text-red-800">
                  {sectorLeadComment}
                </p>
              ) : (
                <p className="mt-1 text-red-800">
                  Update the form below, then click <strong>Resubmit for Review</strong>.
                </p>
              )}
            </div>
          )}

          {fieldErrors.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <p className="font-semibold">Missing required fields:</p>
              <ul className="mt-2 max-h-48 list-inside list-disc overflow-y-auto">
                {fieldErrors.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-2xl border border-green-100 bg-white p-6 shadow-sm sm:p-8 lg:min-h-[32rem]">
        {contentStep === 1 && (
          <div className="space-y-5">
            <SectionTitle step={step} totalSteps={maxStep} title="Engagement Type & Conference" />
            {!isMm && (
              <div className="rounded-lg border border-slate-100 bg-slate-50/80 p-4">
                {isDirectStaffAdmin ? (
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-slate-700">
                      Ministry <span className="text-red-500">*</span>
                    </span>
                    <select
                      value={form.ministry_id || ''}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          ministry_id: e.target.value,
                          conference_key: '',
                        }))
                      }
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                      required
                    >
                      <option value="">Select ministry</option>
                      {ministries.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <p className="text-sm text-slate-600">
                    Ministry:{' '}
                    <strong>
                      {ministry?.name ||
                        ministries.find((m) => String(m.id) === String(form.ministry_id))?.name ||
                        'Your ministry'}
                    </strong>
                  </p>
                )}
              </div>
            )}
            {isMm && (
              <div className="grid gap-4 sm:grid-cols-2">
                {isSuperAdmin && (
          <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Side</label>
            <select
                      value={form.side}
                      onChange={(e) => setForm((f) => ({ ...f, side: e.target.value }))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    >
                      {MM_SIDES.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                </option>
              ))}
            </select>
          </div>
                )}
                {!isSuperAdmin && (isPartyA || isInvestor) && (
                  <p className="text-sm text-slate-600 sm:col-span-2">
                    Submitting as <strong>{form.side === 'side_a' ? 'Side A' : 'Side B'}</strong>
                  </p>
                )}
                <Field
                  label="Country"
                  value={form.country}
                  onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
                  required={!isSideB}
                />
                <Select
                  label="Sector"
                  value={form.sector}
                  onChange={applySectorSelection}
                  options={sectors}
                />
              </div>
            )}
            <p className="text-sm text-slate-600">
              Select how this proposal connects government and business parties, then enter conference
              details{isSideB ? ' (optional for Side B)' : ''}.
            </p>
            <EngagementTypePicker value={form.engagement_type} onChange={applyEngagementType} />
            {form.engagement_type ? (
              <div className="space-y-4 rounded-xl border border-slate-100 bg-slate-50/50 p-4 sm:p-5">
                <p className="text-sm font-medium text-slate-700">Conference details</p>
                {!isMm && (
                  <div>
                    <label
                      htmlFor="conference-picker"
                      className="mb-1 block text-sm font-medium text-slate-700"
                    >
                      Conference
                    </label>
                    <select
                      id="conference-picker"
                      value={form.conference_key}
                      onChange={applyConferenceSelection}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-portal-primary focus:ring-2 focus:ring-portal-primary/30"
                    >
                      <option value="">Select conference…</option>
                      {form.conference_key &&
                        !conferences.some(
                          (c) => (c.key || c.conference_key) === form.conference_key,
                        ) && (
                          <option value={form.conference_key}>
                            {form.conference_info.conference_name || form.conference_key} (current)
                          </option>
                        )}
                      {conferences.map((c) => {
                        const key = c.key || c.conference_key
                        return (
                          <option key={key || c.id} value={key}>
                            {c.name}
                          </option>
                        )
                      })}
                    </select>
                    <p className="mt-1 text-xs text-slate-500">
                      Picking a conference fills the fields below and sends <code>conference_key</code>{' '}
                      on draft save.
                    </p>
                  </div>
                )}
                <Field
                  label="Conference Name"
                  value={form.conference_info.conference_name}
                  onChange={setNested('conference_info', 'conference_name')}
                  required={!isSideB}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Conference Start Date"
                    type="date"
                    value={form.conference_info.conference_date}
                    onChange={setNested('conference_info', 'conference_date')}
                    required={!isSideB}
                  />
                  <Field
                    label="Conference End Date (optional)"
                    type="date"
                    value={form.conference_info.conference_end_date}
                    onChange={setNested('conference_info', 'conference_end_date')}
                  />
                </div>
                <Field
                  label="Conference Location"
                  value={form.conference_info.conference_location}
                  onChange={setNested('conference_info', 'conference_location')}
                  required={!isSideB}
                />
                <Field
                  label="Host / Organizer"
                  value={form.conference_info.conference_host}
                  onChange={setNested('conference_info', 'conference_host')}
                  required={!isSideB}
                />
                <Textarea
                  label="Conference Description (optional)"
                  value={form.conference_info.conference_description}
                  onChange={setNested('conference_info', 'conference_description')}
                />
              </div>
            ) : (
              <p className="rounded-lg border border-dashed border-slate-200 px-4 py-3 text-sm text-slate-500">
                Select an engagement type above to enter conference details.
              </p>
            )}
          </div>
        )}

        {contentStep === 2 && (
          <div className="space-y-5">
            <SectionTitle
              step={step}
              totalSteps={maxStep}
              title={isMm ? 'Your Organization' : 'Party A Information'}
            />
            <EntitySelect
              label={isMm ? 'Entity Type' : 'Party A Entity Type'}
              value={form[orgSection].entity_type}
              onChange={setNested(orgSection, 'entity_type')}
            />
            <Field
              label="Organization / Company Name"
              value={form[orgSection].organization_name}
              onChange={setNested(orgSection, 'organization_name')}
              required
            />
            {form[orgSection].entity_type === 'government' && (
              <Field
                label="Department / Ministry"
                value={form[orgSection].department_ministry}
                onChange={setNested(orgSection, 'department_ministry')}
              />
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Contact Name"
                value={form[orgSection].contact_name}
                onChange={setNested(orgSection, 'contact_name')}
                required
              />
              <Field
                label="Designation"
                value={form[orgSection].designation}
                onChange={setNested(orgSection, 'designation')}
                required={!isSideB}
              />
              <Field
                label="Email"
                type="email"
                value={form[orgSection].email}
                onChange={setNested(orgSection, 'email')}
                required
              />
              <Field
                label="Phone"
                value={form[orgSection].phone}
                onChange={setNested(orgSection, 'phone')}
                required={!isSideB}
              />
              <Field
                label="Country"
                value={form[orgSection].country}
                onChange={setNested(orgSection, 'country')}
                required={!isSideB}
              />
              <Field
                label="City (optional)"
                value={form[orgSection].city}
                onChange={setNested(orgSection, 'city')}
              />
            </div>
          </div>
        )}

        {!isMm && contentStep === 3 && (
          <div className="space-y-5">
            <SectionTitle
              step={3}
              totalSteps={maxStep}
              title="Party B Information"
            />
            <EntitySelect
              label="Party B Entity Type"
              value={form.party_b_entity_type}
              onChange={setField('party_b_entity_type')}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Full Name"
                value={form.party_b_name}
                onChange={setField('party_b_name')}
                required
              />
              <Field
                label="Organization"
                value={form.party_b_organization}
                onChange={setField('party_b_organization')}
                required
              />
              <Field
                label="Email"
                type="email"
                value={form.party_b_email}
                onChange={setField('party_b_email')}
                required
              />
              <Field
                label="Phone"
                value={form.party_b_phone}
                onChange={setField('party_b_phone')}
                required
              />
          <Field
                label="Country"
                value={form.party_b_country}
                onChange={setField('party_b_country')}
            required
          />
            </div>
          </div>
        )}

        {contentStep === 4 && (
          <div className="space-y-5">
            <SectionTitle step={step} totalSteps={maxStep} title="Cover Page" />
            <Field label="Company Name" value={form.company_name} onChange={setField('company_name')} required />
            {isMm && (
              <Field
                label="Venture Name"
                value={form.venture_name}
                onChange={setField('venture_name')}
                required
              />
            )}
            <div className="grid gap-4 sm:grid-cols-2">
            <ImageField
              label="Company Logo (PNG/JPG, optional)"
              uploading={uploading === 'company_logo_url'}
              fileUrl={form.company_logo_url}
              accept="image/*"
              onChange={(e) => handleUpload(e, 'company_logo', 'company_logo_url')}
            />
            <ImageField
              label="Cover Image (optional)"
              uploading={uploading === 'cover_image_url'}
              fileUrl={form.cover_image_url}
              accept="image/*"
              onChange={(e) => handleUpload(e, 'cover_image', 'cover_image_url')}
            />
            </div>
          </div>
        )}

        {contentStep === 5 && (
          <div className="space-y-5">
            <SectionTitle step={step} totalSteps={maxStep} title="Executive Summary" />
            {!isMm && (
              <>
                <Select
                  label="Key Sector"
                  value={form.sector}
                  onChange={applySectorSelection}
                  options={sectors}
                />
                <p className="text-sm text-slate-600">
                  <strong>Key Sector</strong> routes your proposal to the right Sector Lead. The
                  alignment note below is a short executive-summary narrative — not the same field
                  as sector.
                </p>
              </>
            )}
            {!isMm && (
              <div>
                <label htmlFor="sifc-category" className="mb-1 block text-sm font-medium text-slate-700">
                  SIFC Category
                </label>
                <select
                  id="sifc-category"
                  value={form.sifc_category}
                  onChange={applySifcCategory}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-portal-primary focus:ring-2 focus:ring-portal-primary/30"
                >
                  <option value="">Select SIFC category…</option>
                  {form.sifc_category &&
                    !sifcCategories.some((c) => c.name === form.sifc_category) && (
                      <option value={form.sifc_category}>{form.sifc_category} (current)</option>
                    )}
                  {sifcCategories.map((cat) => (
                    <option key={cat.id || cat.name} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <Textarea label="Brief Company Overview" value={form.executive_summary.company_overview} onChange={setNested('executive_summary', 'company_overview')} required />
            <Textarea label="Brief Project Overview" value={form.executive_summary.project_overview} onChange={setNested('executive_summary', 'project_overview')} required />
            <Field label="Project Segment" value={form.executive_summary.project_segment} onChange={setNested('executive_summary', 'project_segment')} required />
            {(() => {
              const conferenceName = form.conference_info?.conference_name || ''
              const suggestedAlignment = draft.defaultSectorAlignmentText(form.sector, conferenceName)
              const alignmentText = form.executive_summary.sector_alignment?.trim() || ''
              const alignmentCustomized =
                Boolean(alignmentText) &&
                !draft.isAutoSectorAlignment(alignmentText, form.sector, conferenceName)
              const showAlignmentEditor = alignmentExpanded || alignmentCustomized

              if (!showAlignmentEditor) {
                return (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-sm font-medium text-slate-700">
                      Conference priority alignment
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {alignmentText ||
                        suggestedAlignment ||
                        'Select a Key Sector to generate a suggested alignment narrative.'}
                    </p>
                    <button
                      type="button"
                      onClick={() => setAlignmentExpanded(true)}
                      className="mt-2 text-sm font-medium text-portal-primary hover:underline"
                    >
                      Customize alignment narrative
                    </button>
                  </div>
                )
              }

              return (
                <div className="space-y-2">
                  <Textarea
                    label="How does this project align with conference priorities?"
                    hint="Optional narrative for the executive summary. Key Sector is the category; this explains policy / conference fit."
                    value={form.executive_summary.sector_alignment}
                    onChange={setNested('executive_summary', 'sector_alignment')}
                  />
                  {!alignmentCustomized && (
                    <button
                      type="button"
                      onClick={() => {
                        setAlignmentExpanded(false)
                        setForm((f) => ({
                          ...f,
                          executive_summary: {
                            ...f.executive_summary,
                            sector_alignment: draft.defaultSectorAlignmentText(
                              f.sector,
                              f.conference_info?.conference_name,
                            ),
                          },
                        }))
                      }}
                      className="text-sm font-medium text-slate-600 hover:text-portal-primary hover:underline"
                    >
                      Use suggested text
                    </button>
                  )}
                </div>
              )
            })()}
            <Field label="Investment Ask (summary)" value={form.executive_summary.investment_ask_summary} onChange={setNested('executive_summary', 'investment_ask_summary')} required />
          </div>
        )}

        {contentStep === 6 && (
          <div className="space-y-4">
            <SectionTitle step={step} totalSteps={maxStep} title="Company Overview" />
            <Field label="Years in Operation" value={form.company_overview.years_in_operation} onChange={setNested('company_overview', 'years_in_operation')} />
            <Textarea label="Current Market Standing in Pakistan" value={form.company_overview.market_standing_pakistan} onChange={setNested('company_overview', 'market_standing_pakistan')} />
            <Textarea label="Key Certifications (international compliance)" value={form.company_overview.key_certifications} onChange={setNested('company_overview', 'key_certifications')} />
            <Textarea label="Current Infrastructure & Assets" value={form.company_overview.infrastructure_assets} onChange={setNested('company_overview', 'infrastructure_assets')} />
            <Textarea label="Land / Project / Capacity" value={form.company_overview.land_project_capacity} onChange={setNested('company_overview', 'land_project_capacity')} />
            <Textarea label="Value Chain — Scope of Operations" value={form.company_overview.value_chain_scope} onChange={setNested('company_overview', 'value_chain_scope')} />
            <Textarea label="What You Provide (land, labor, regulatory relations)" value={form.company_overview.local_provisions} onChange={setNested('company_overview', 'local_provisions')} />
            <Textarea label="Export Centricity (readiness for Chinese quality standards)" value={form.company_overview.export_centricity} onChange={setNested('company_overview', 'export_centricity')} />
          </div>
        )}

        {contentStep === 7 && (
          <div className="space-y-4">
            <SectionTitle step={step} totalSteps={maxStep} title="Project Overview" />
            {!isMm && (
            <Field label="Venture Name" value={form.venture_name} onChange={setField('venture_name')} required />
            )}
            <Textarea label="Core Activity" value={form.project_overview.core_activity} onChange={setNested('project_overview', 'core_activity')} />
            <Field label="Strategic Site Location" value={form.project_overview.site_location} onChange={setNested('project_overview', 'site_location')} />
            <Field label="Site Readiness Status" value={form.project_overview.site_readiness_status} onChange={setNested('project_overview', 'site_readiness_status')} />
            <Textarea label="Chinese Technology Sought" value={form.project_overview.chinese_technology_sought} onChange={setNested('project_overview', 'chinese_technology_sought')} />
            <Textarea label="Value-Addition Goal" value={form.project_overview.value_addition_goal} onChange={setNested('project_overview', 'value_addition_goal')} />
            <Field label="Targeted Production Capacity" value={form.project_overview.target_production_capacity} onChange={setNested('project_overview', 'target_production_capacity')} />
            <Textarea label="Phased Roadmap" value={form.project_overview.phased_roadmap} onChange={setNested('project_overview', 'phased_roadmap')} />
            <Textarea label="Economic & Strategic Impact" value={form.project_overview.economic_impact} onChange={setNested('project_overview', 'economic_impact')} />
            <Textarea label="Sustainability Metrics" value={form.project_overview.sustainability_metrics} onChange={setNested('project_overview', 'sustainability_metrics')} />
          </div>
        )}

        {contentStep === 8 && (
          <div className="space-y-4">
            <SectionTitle step={step} totalSteps={maxStep} title="Financials" />
            <FinancialsEditor
              financials={form.financials}
              onChange={(financials) => setForm((f) => ({ ...f, financials }))}
            />
          </div>
        )}

        {contentStep === 9 && (
          <div className="space-y-4">
            <SectionTitle step={step} totalSteps={maxStep} title="Investment Ask" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Total Project Cost (USD)" value={form.investment_ask.total_project_cost_usd} onChange={setNested('investment_ask', 'total_project_cost_usd')} />
              <Field label="Equity Ask (USD)" value={form.investment_ask.investment_ask_equity_usd} onChange={setNested('investment_ask', 'investment_ask_equity_usd')} />
              <Field label="Debt Ask (USD, optional)" value={form.investment_ask.investment_ask_debt_usd} onChange={setNested('investment_ask', 'investment_ask_debt_usd')} />
              <Field label="Sponsor Contribution Type" value={form.investment_ask.sponsor_contribution_type} onChange={setNested('investment_ask', 'sponsor_contribution_type')} />
              <Field label="Sponsor Contribution Amount" value={form.investment_ask.sponsor_contribution_amount} onChange={setNested('investment_ask', 'sponsor_contribution_amount')} />
            </div>
            <p className="text-sm font-medium text-slate-700">Utilization of Funds (% — must total 100)</p>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Technology Acquisition %" value={form.investment_ask.fund_utilization_technology_pct} onChange={setNested('investment_ask', 'fund_utilization_technology_pct')} />
              <Field label="Infrastructure & Civil Works %" value={form.investment_ask.fund_utilization_infrastructure_pct} onChange={setNested('investment_ask', 'fund_utilization_infrastructure_pct')} />
              <Field label="Working Capital %" value={form.investment_ask.fund_utilization_working_capital_pct} onChange={setNested('investment_ask', 'fund_utilization_working_capital_pct')} />
            </div>
            <p
              className={`text-sm font-medium ${utilizationOk ? 'text-green-700' : utilizationTotal > 0 ? 'text-amber-700' : 'text-slate-500'}`}
            >
              Total: {utilizationTotal}% {utilizationOk ? '✓' : utilizationTotal > 0 ? '(must equal 100%)' : ''}
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Projected IRR %" value={form.investment_ask.projected_irr_pct} onChange={setNested('investment_ask', 'projected_irr_pct')} />
              <Field label="Payback Period (years)" value={form.investment_ask.payback_period_years} onChange={setNested('investment_ask', 'payback_period_years')} />
            </div>
            <Textarea label="Phase 1 Milestone (6–12 months)" value={form.investment_ask.milestone_phase_1} onChange={setNested('investment_ask', 'milestone_phase_1')} />
            <Textarea label="Phase 2 Milestone (12–24 months)" value={form.investment_ask.milestone_phase_2} onChange={setNested('investment_ask', 'milestone_phase_2')} />
            <Textarea label="Phase 3 Milestone (24+ months)" value={form.investment_ask.milestone_phase_3} onChange={setNested('investment_ask', 'milestone_phase_3')} />
            <p className="text-sm font-medium text-slate-700">Funds Summary (PKR Mn)</p>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Sponsor Contribution" value={form.investment_ask.sponsor_contribution_pkr_mn} onChange={setNested('investment_ask', 'sponsor_contribution_pkr_mn')} />
              <Field label="Raising from Investors" value={form.investment_ask.raising_from_investors_pkr_mn} onChange={setNested('investment_ask', 'raising_from_investors_pkr_mn')} />
              <Field label="Total Funds Required" value={form.investment_ask.total_funds_required_pkr_mn} onChange={setNested('investment_ask', 'total_funds_required_pkr_mn')} />
            </div>
          </div>
        )}

        {contentStep === 10 && (
          <div className="space-y-5">
            <SectionTitle step={step} totalSteps={maxStep} title={isMm ? 'Contact & Proposal File' : 'Contact & Pitch Deck'} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Contact Name" value={form.contact_info.name} onChange={setNested('contact_info', 'name')} />
              <Field label="Designation" value={form.contact_info.designation} onChange={setNested('contact_info', 'designation')} />
              <Field label="Email" type="email" value={form.contact_info.email} onChange={setNested('contact_info', 'email')} />
              <Field label="Cell" value={form.contact_info.cell} onChange={setNested('contact_info', 'cell')} />
              <Field label="WeChat (optional)" value={form.contact_info.wechat} onChange={setNested('contact_info', 'wechat')} />
            </div>
            {isMm && (
              <Field
                label="Search tags (comma-separated, optional)"
                value={form.keyword_tags}
                onChange={setField('keyword_tags')}
              />
            )}
            <FileField
              label={isMm ? 'Proposal File (PDF/DOC/DOCX)' : 'Pitch Deck Upload (PDF/DOC/DOCX — optional)'}
              uploading={uploading === 'proposal_file_url'}
              fileUrl={form.proposal_file_url || form.file_url}
              onChange={(e) => handleUpload(e, 'proposal_file', 'proposal_file_url')}
            />
          </div>
        )}

        {!isMm && contentStep === 11 && (
          <div className="space-y-6">
            <SectionTitle step={step} totalSteps={maxStep} title="MOU" />
            <p className="text-sm text-slate-600">
              Final step: add <strong>Scope</strong> and the MOU file. Sector and Demand sync from
              earlier steps (Key Sector + Investment Ask) — edit those on Details after approve.
            </p>
            <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm sm:grid-cols-2">
              <div>
                <p className="font-medium text-slate-700">Sector (from Step 5)</p>
                <p className="mt-1 text-slate-600">
                  {form.sector || '— complete Step 5 (Key Sector)'}
                </p>
              </div>
              <div>
                <p className="font-medium text-slate-700">Demand (from Step 9)</p>
                <p className="mt-1 text-slate-600">
                  {form.investment_ask?.total_project_cost_usd
                    ? `USD ${form.investment_ask.total_project_cost_usd} million`
                    : '— complete Step 9 (Investment Ask)'}
                </p>
              </div>
            </div>
            <Field label="Scope" value={form.mou_scope} onChange={setField('mou_scope')} />
            <FileField
              label="MOU File (PDF/DOC/DOCX)"
              uploading={uploading === 'mou_file_url'}
              fileUrl={form.mou_file_url}
              onChange={(e) => handleUpload(e, 'mou_file', 'mou_file_url')}
            />
          </div>
        )}

        <NavButtons
          step={step}
          maxStep={maxStep}
          loading={loading}
          savingDraft={savingDraft}
          nextDisabled={contentStep === 1 && !form.engagement_type}
          onBack={handleBack}
          onNext={handleNext}
          onSaveDraft={handleSaveDraftOnly}
          onSubmit={handleSubmitClick}
          isResubmit={isRejectedResubmit}
          submitLabel={isMm ? 'Submit for Review' : undefined}
        />
          </div>
        </div>
      </div>

      <Modal
        open={resubmitConfirmOpen}
        title="Resubmit for review?"
        onClose={() => setResubmitConfirmOpen(false)}
        onConfirm={handleResubmit}
        confirmLabel="Resubmit for Review"
        loading={loading}
      >
        <p className="text-sm text-slate-600">
          Send your updated proposal to Sector Lead for review?
        </p>
      </Modal>
    </div>
  )
}

function SectionTitle({ step, totalSteps, title }) {
  return (
    <div className="border-b border-slate-100 pb-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-green-700">
        Step {step} of {totalSteps}
      </p>
      <h3 className="mt-1 text-xl font-semibold text-slate-800">{title}</h3>
    </div>
  )
}

function StepSidebar({ current, completedSteps, steps, onStepClick }) {
  const stepIndex = steps.findIndex((s) => s.num === current)
  const pct = Math.round(((stepIndex + 1) / steps.length) * 100)

  return (
    <nav
      className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto rounded-2xl border border-green-100 bg-white p-4 shadow-sm"
      aria-label="Form steps"
    >
      <div className="mb-4 border-b border-slate-100 pb-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-green-700">
          Progress
        </p>
        <p className="mt-1 text-sm font-medium text-slate-600">
          Step {stepIndex + 1} of {steps.length}
        </p>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-portal-primary transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <ol className="space-y-0.5">
        {steps.map((s, idx) => {
          const done = completedSteps.has(s.num)
          const active = current === s.num
          return (
            <li key={s.num}>
              <button
                type="button"
                onClick={() => onStepClick(s.num)}
                disabled={active}
                title={active ? 'Current step' : `Go to ${s.label}`}
                className={`flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left text-sm transition-colors ${
                  active
                    ? 'cursor-default bg-green-50 text-green-900 ring-1 ring-inset ring-green-200'
                    : done
                      ? 'text-slate-700 hover:bg-slate-50'
                      : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    active
                      ? 'bg-portal-primary text-white'
                      : done
                        ? 'bg-green-100 text-green-800'
                        : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {done ? '✓' : idx + 1}
                </span>
                <span className={`min-w-0 font-medium leading-snug ${active ? 'text-slate-900' : ''}`}>
                  {s.label}
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

function MobileStepProgress({ current, label, steps, onStepClick }) {
  const stepIndex = steps.findIndex((s) => s.num === current)
  const pct = Math.round(((stepIndex + 1) / steps.length) * 100)
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm lg:hidden">
      <div className="mb-2 flex items-center justify-between gap-2 text-sm">
        <label htmlFor="mobile-step-jump" className="shrink-0 font-semibold text-slate-800">
          Jump to step
        </label>
        <select
          id="mobile-step-jump"
          value={current}
          onChange={(e) => onStepClick(Number(e.target.value))}
          className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-700 outline-none focus:border-portal-primary"
        >
          {steps.map((s, idx) => (
            <option key={s.num} value={s.num}>
              {idx + 1}. {s.label}
            </option>
          ))}
        </select>
      </div>
      <p className="mb-2 text-xs text-slate-500">{label}</p>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-portal-primary transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
              </div>
  )
}

function NavButtons({
  step,
  maxStep,
  loading,
  savingDraft,
  nextDisabled,
  onBack,
  onNext,
  onSaveDraft,
  onSubmit,
  isResubmit = false,
  submitLabel,
}) {
  const isFirst = step <= 1
  const finalSubmitLabel = submitLabel || (isResubmit ? 'Resubmit for Review' : 'Submit Opportunity')

  return (
    <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {!isFirst ? (
        <button type="button" onClick={onBack} disabled={loading || savingDraft} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50">
          Back
        </button>
      ) : (
        <span className="hidden sm:block" />
      )}
      <div className="flex flex-wrap justify-end gap-3">
        <button type="button" onClick={onSaveDraft} disabled={loading || savingDraft} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
          {savingDraft && <LoadingSpinner size="sm" />}
          {isResubmit ? 'Save Changes' : 'Save as Draft'}
        </button>
        {step < maxStep ? (
          <button type="button" onClick={onNext} disabled={loading || savingDraft || nextDisabled} className="inline-flex items-center gap-2 rounded-lg bg-portal-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-portal-primary-hover disabled:opacity-60">
            {loading && <LoadingSpinner size="sm" />}
            Save & Next
          </button>
        ) : (
          <button type="button" onClick={onSubmit} disabled={loading || savingDraft} className="inline-flex items-center gap-2 rounded-lg bg-portal-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-portal-primary-hover disabled:opacity-60">
            {loading && <LoadingSpinner size="sm" />}
            {finalSubmitLabel}
          </button>
            )}
          </div>
    </div>
  )
}

function EngagementTypePicker({ value, onChange }) {
  return (
    <div>
      <p className="mb-2 block text-sm font-medium text-slate-700">Engagement Type *</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {ENGAGEMENT_TYPES.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => onChange(t.value)}
            className={`rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
              value === t.value
                ? 'border-portal-primary bg-green-50 font-semibold text-green-900'
                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function EntitySelect({ label, value, onChange }) {
  const id = label.toLowerCase().replace(/\s/g, '-')
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-700">
        {label} *
      </label>
      <select
        id={id}
        value={value}
        onChange={onChange}
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-portal-primary focus:ring-2 focus:ring-portal-primary/30"
      >
        <option value="">Select…</option>
        {ENTITY_TYPES.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>
    </div>
  )
}

function Field({ label, type = 'text', value, onChange, required }) {
  const id = label.toLowerCase().replace(/\s/g, '-')
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      <input id={id} type={type} value={value} onChange={onChange} required={required} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-portal-primary focus:ring-2 focus:ring-portal-primary/30" />
    </div>
  )
}

function Textarea({ label, value, onChange, required, hint }) {
  const id = label.toLowerCase().replace(/\s/g, '-')
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      {hint && <p className="mb-2 text-xs text-slate-500">{hint}</p>}
      <textarea id={id} rows={3} value={value} onChange={onChange} required={required} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-portal-primary focus:ring-2 focus:ring-portal-primary/30" />
    </div>
  )
}

function Select({ label, value, onChange, options }) {
  const id = label.toLowerCase().replace(/\s/g, '-')
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      <select id={id} value={value} onChange={onChange} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-portal-primary focus:ring-2 focus:ring-portal-primary/30">
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  )
}

function FileField({ label, uploading, fileUrl, onChange }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      <input type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={onChange} disabled={uploading} className="w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium" />
      {uploading && <p className="mt-1 flex items-center gap-2 text-xs text-slate-500"><LoadingSpinner size="sm" /> Uploading…</p>}
      {fileUrl && !uploading && <p className="mt-1 text-xs text-green-600">Uploaded · <a href={fileUrl} target="_blank" rel="noreferrer" className="underline">View</a></p>}
    </div>
  )
}

function ImageField({ label, uploading, fileUrl, accept, onChange }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      <input type="file" accept={accept} onChange={onChange} disabled={uploading} className="w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium" />
      {uploading && <p className="mt-1 flex items-center gap-2 text-xs text-slate-500"><LoadingSpinner size="sm" /> Uploading…</p>}
      {fileUrl && !uploading && (
        <p className="mt-1 text-xs text-green-600">
          Uploaded · <a href={fileUrl} target="_blank" rel="noreferrer" className="underline">View</a>
        </p>
      )}
    </div>
  )
}
