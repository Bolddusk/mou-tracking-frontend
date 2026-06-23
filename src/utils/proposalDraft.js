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
  const form = mergeNested(EMPTY_PROPOSAL_FORM, proposal)
  const step = detectStepFromForm(form)
  const completedSteps = loadCompletedSteps(proposal.id)
  persistFormState(form, step, proposal.id)
  persistCompletedSteps(completedSteps, proposal.id)
  return { form, step, proposalId: proposal.id, completedSteps }
}

export function proposalToFormPayload(form, proposalId) {
  const payload = { ...form }
  if (proposalId) payload.proposal_id = proposalId
  return payload
}
