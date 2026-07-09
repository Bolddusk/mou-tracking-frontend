import { EMPTY_PROPOSAL_FORM, TOTAL_STEPS } from '../constants/proposalTemplate'
import {
  PROPOSAL_COMPLETED_STEPS_KEY,
  PROPOSAL_DRAFT_ID_KEY,
  PROPOSAL_DRAFT_STEP_KEY,
  PROPOSAL_FORM_KEY,
} from '../constants/sectors'

const MAX_STEP = TOTAL_STEPS

function mergeNested(base, incoming) {
  if (!incoming || typeof incoming !== 'object') return base
  if (Array.isArray(base)) return Array.isArray(incoming) ? incoming : base
  const out = { ...base }
  for (const key of Object.keys(base)) {
    if (incoming[key] !== undefined && incoming[key] !== null) {
      if (typeof base[key] === 'object' && !Array.isArray(base[key])) {
        out[key] = mergeNested(base[key], incoming[key])
      } else {
        out[key] = incoming[key]
      }
    }
  }
  return out
}

function hasValue(v) {
  return v !== null && v !== undefined && String(v).trim() !== ''
}

/** Suggested executive-summary narrative when the user has not written custom alignment. */
export function defaultSectorAlignmentText(sector, conferenceName) {
  const sectorLabel = String(sector || '').trim()
  if (!sectorLabel) return ''
  const conf = String(conferenceName || '').trim()
  if (conf) {
    return `Directly supports ${sectorLabel} sector priorities under ${conf} — import substitution and technology transfer.`
  }
  return `Directly supports ${sectorLabel} sector priorities under Pak-China Agri-Investment Conference — import substitution and technology transfer.`
}

export function isAutoSectorAlignment(alignment, sector, conferenceName) {
  const text = String(alignment || '').trim()
  if (!text) return true
  return text === defaultSectorAlignmentText(sector, conferenceName)
}

function completedStepsKey(proposalId) {
  return proposalId ? String(proposalId) : '_session'
}

export function loadCompletedSteps(proposalId) {
  try {
    const raw = localStorage.getItem(PROPOSAL_COMPLETED_STEPS_KEY)
    if (!raw) return new Set()
    const all = JSON.parse(raw)
    const steps = all[completedStepsKey(proposalId)]
    return new Set(Array.isArray(steps) ? steps : [])
  } catch {
    return new Set()
  }
}

export function persistCompletedSteps(completedSteps, proposalId) {
  try {
    const raw = localStorage.getItem(PROPOSAL_COMPLETED_STEPS_KEY)
    const all = raw ? JSON.parse(raw) : {}
    all[completedStepsKey(proposalId)] = [...completedSteps].sort((a, b) => a - b)
    localStorage.setItem(PROPOSAL_COMPLETED_STEPS_KEY, JSON.stringify(all))
  } catch {
    /* ignore storage errors */
  }
}

export function loadFormState() {
  try {
    const raw = localStorage.getItem(PROPOSAL_FORM_KEY)
    const step = Number(localStorage.getItem(PROPOSAL_DRAFT_STEP_KEY)) || 1
    const proposalId = localStorage.getItem(PROPOSAL_DRAFT_ID_KEY)
    const parsed = raw ? mergeNested(EMPTY_PROPOSAL_FORM, JSON.parse(raw)) : { ...EMPTY_PROPOSAL_FORM }
    const id = proposalId ? Number(proposalId) : null
    return {
      form: parsed,
      step: step >= 1 && step <= MAX_STEP ? step : 1,
      proposalId: id,
      completedSteps: loadCompletedSteps(id),
    }
  } catch {
    return { form: { ...EMPTY_PROPOSAL_FORM }, step: 1, proposalId: null, completedSteps: new Set() }
  }
}

export function persistFormState(form, step, proposalId) {
  localStorage.setItem(PROPOSAL_FORM_KEY, JSON.stringify(form))
  localStorage.setItem(PROPOSAL_DRAFT_STEP_KEY, String(step))
  if (proposalId) {
    localStorage.setItem(PROPOSAL_DRAFT_ID_KEY, String(proposalId))
  } else {
    localStorage.removeItem(PROPOSAL_DRAFT_ID_KEY)
  }
}

export function clearFormState(proposalIdToClear = null) {
  localStorage.removeItem(PROPOSAL_FORM_KEY)
  localStorage.removeItem(PROPOSAL_DRAFT_STEP_KEY)
  localStorage.removeItem(PROPOSAL_DRAFT_ID_KEY)

  try {
    const raw = localStorage.getItem(PROPOSAL_COMPLETED_STEPS_KEY)
    if (!raw) return
    const all = JSON.parse(raw)
    delete all._session
    if (proposalIdToClear) delete all[String(proposalIdToClear)]
    if (Object.keys(all).length === 0) {
      localStorage.removeItem(PROPOSAL_COMPLETED_STEPS_KEY)
    } else {
      localStorage.setItem(PROPOSAL_COMPLETED_STEPS_KEY, JSON.stringify(all))
    }
  } catch {
    localStorage.removeItem(PROPOSAL_COMPLETED_STEPS_KEY)
  }
}

export function detectStepFromForm(form) {
  if (
    hasValue(form.mou_scope) ||
    hasValue(form.mou_description) ||
    hasValue(form.mou_demand) ||
    hasValue(form.mou_file_url)
  ) {
    return 11
  }

  if (
    hasValue(form.contact_info?.name) ||
    hasValue(form.contact_info?.email) ||
    hasValue(form.proposal_file_url)
  ) {
    return 10
  }

  if (Object.values(form.investment_ask || {}).some(hasValue)) return 9
  if (
    (form.financials?.years || []).some((y) => hasValue(y.label)) ||
    (form.financials?.additional_rows || []).length > 0
  ) {
    return 8
  }

  if (Object.values(form.project_overview || {}).some(hasValue) || hasValue(form.venture_name)) {
    return 7
  }

  if (Object.values(form.company_overview || {}).some(hasValue)) return 6
  if (Object.values(form.executive_summary || {}).some(hasValue) || hasValue(form.project_type)) {
    return 5
  }
  if (hasValue(form.company_name) || hasValue(form.company_logo_url)) return 4

  if (
    hasValue(form.party_b_name) ||
    hasValue(form.party_b_email) ||
    hasValue(form.party_b_entity_type)
  ) {
    return 3
  }

  if (Object.values(form.party_a_info || {}).some(hasValue)) return 2

  if (
    hasValue(form.engagement_type) ||
    Object.values(form.conference_info || {}).some(hasValue)
  ) {
    return 1
  }

  return 1
}

export function loadDraftFromProposal(proposal) {
  const form = hydrateDraftFormFromProposal(proposal)
  const step = detectStepFromForm(form)
  const completedSteps = loadCompletedSteps(proposal.id)
  persistFormState(form, step, proposal.id)
  persistCompletedSteps(completedSteps, proposal.id)
  return { form, step, proposalId: proposal.id, completedSteps }
}

export function proposalToFormPayload(form, proposalId) {
  const payload = { ...form }
  if (proposalId) payload.proposal_id = proposalId
  payload.cooperation_mode = form.cooperation_mode || 'mou'
  if (form.conference_key) payload.conference_key = form.conference_key
  const conferenceName = form.conference_info?.conference_name || ''
  const exec = { ...(form.executive_summary || {}) }
  if (!hasValue(exec.sector_alignment) && hasValue(form.sector)) {
    exec.sector_alignment = defaultSectorAlignmentText(form.sector, conferenceName)
  }
  if (hasValue(form.sector)) {
    payload.mou_sector = String(form.sector).trim()
  }
  if (hasValue(form.investment_ask?.total_project_cost_usd)) {
    payload.mou_demand = `USD ${String(form.investment_ask.total_project_cost_usd).trim()} million`
  }
  if (form.sifc_category) {
    payload.sifc_category = form.sifc_category
    exec.sifc_category = form.sifc_category
  }
  payload.executive_summary = exec
  return payload
}

export function hydrateDraftFormFromProposal(proposal) {
  const form = mergeNested(EMPTY_PROPOSAL_FORM, proposal)
  const sifc =
    proposal?.sifc_category ||
    proposal?.executive_summary?.sifc_category ||
    form.sifc_category ||
    ''
  form.sifc_category = sifc
  if (sifc && form.executive_summary) {
    form.executive_summary.sifc_category = sifc
  }
  if (proposal?.conference_key) {
    form.conference_key = proposal.conference_key
  }
  if (!form.cooperation_mode) {
    form.cooperation_mode = proposal?.cooperation_mode || 'mou'
  }
  return form
}
