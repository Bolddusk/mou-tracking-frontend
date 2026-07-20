import { EMPTY_PROPOSAL_FORM } from '../constants/proposalTemplate'

const FORM_KEY = 'mm_v3_form'
const STEP_KEY = 'mm_v3_step'
const ID_KEY = 'mm_v3_proposal_id'
const COMPLETED_KEY = 'mm_v3_completed_steps'
const ON_BEHALF_KEY = 'mm_v3_on_behalf_id'
const ON_BEHALF_LABEL_KEY = 'mm_v3_on_behalf_label'

function cloneOrg() {
  return { ...EMPTY_PROPOSAL_FORM.party_a_info }
}

export const EMPTY_MM_PROPOSAL_FORM = {
  country: '',
  side: 'side_a',
  engagement_type: '',
  conference_info: { ...EMPTY_PROPOSAL_FORM.conference_info },
  submitter_info: cloneOrg(),
  company_name: '',
  company_logo_url: '',
  cover_image_url: '',
  sector: EMPTY_PROPOSAL_FORM.sector,
  project_type: EMPTY_PROPOSAL_FORM.project_type,
  venture_name: '',
  executive_summary: { ...EMPTY_PROPOSAL_FORM.executive_summary },
  company_overview: { ...EMPTY_PROPOSAL_FORM.company_overview },
  project_overview: { ...EMPTY_PROPOSAL_FORM.project_overview },
  financials: JSON.parse(JSON.stringify(EMPTY_PROPOSAL_FORM.financials)),
  investment_ask: { ...EMPTY_PROPOSAL_FORM.investment_ask },
  contact_info: { ...EMPTY_PROPOSAL_FORM.contact_info },
  proposal_file_url: '',
  file_url: '',
  keyword_tags: '',
  description: '',
}

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

function completedKey(proposalId) {
  return proposalId ? String(proposalId) : '_session'
}

export function loadCompletedSteps(proposalId) {
  try {
    const raw = localStorage.getItem(COMPLETED_KEY)
    if (!raw) return new Set()
    const all = JSON.parse(raw)
    const steps = all[completedKey(proposalId)]
    return new Set(Array.isArray(steps) ? steps : [])
  } catch {
    return new Set()
  }
}

export function persistCompletedSteps(completedSteps, proposalId) {
  try {
    const raw = localStorage.getItem(COMPLETED_KEY)
    const all = raw ? JSON.parse(raw) : {}
    all[completedKey(proposalId)] = [...completedSteps].sort((a, b) => a - b)
    localStorage.setItem(COMPLETED_KEY, JSON.stringify(all))
  } catch {
    /* ignore */
  }
}

export function loadFormState() {
  try {
    const raw = localStorage.getItem(FORM_KEY)
    const step = Number(localStorage.getItem(STEP_KEY)) || 1
    const proposalId = localStorage.getItem(ID_KEY)
    const form = raw
      ? mergeNested(EMPTY_MM_PROPOSAL_FORM, JSON.parse(raw))
      : { ...EMPTY_MM_PROPOSAL_FORM }
    const id = proposalId ? Number(proposalId) : null
    return {
      form,
      step: step >= 1 && step <= 9 ? step : 1,
      proposalId: id,
      completedSteps: loadCompletedSteps(id),
    }
  } catch {
    return {
      form: { ...EMPTY_MM_PROPOSAL_FORM },
      step: 1,
      proposalId: null,
      completedSteps: new Set(),
    }
  }
}

export function persistFormState(form, step, proposalId) {
  localStorage.setItem(FORM_KEY, JSON.stringify(form))
  localStorage.setItem(STEP_KEY, String(step))
  if (proposalId) localStorage.setItem(ID_KEY, String(proposalId))
  else localStorage.removeItem(ID_KEY)
}

export function loadOnBehalfId() {
  const v = localStorage.getItem(ON_BEHALF_KEY)
  return v ? Number(v) : null
}

export function loadOnBehalfLabel() {
  return localStorage.getItem(ON_BEHALF_LABEL_KEY) || ''
}

export function persistOnBehalf(id, label = '') {
  if (id) localStorage.setItem(ON_BEHALF_KEY, String(id))
  else localStorage.removeItem(ON_BEHALF_KEY)
  if (label) localStorage.setItem(ON_BEHALF_LABEL_KEY, label)
  else localStorage.removeItem(ON_BEHALF_LABEL_KEY)
}

export function clearFormState(proposalIdToClear = null) {
  localStorage.removeItem(FORM_KEY)
  localStorage.removeItem(STEP_KEY)
  localStorage.removeItem(ID_KEY)
  localStorage.removeItem(ON_BEHALF_KEY)
  localStorage.removeItem(ON_BEHALF_LABEL_KEY)
  try {
    const raw = localStorage.getItem(COMPLETED_KEY)
    if (!raw) return
    const all = JSON.parse(raw)
    delete all._session
    if (proposalIdToClear) delete all[String(proposalIdToClear)]
    if (Object.keys(all).length === 0) localStorage.removeItem(COMPLETED_KEY)
    else localStorage.setItem(COMPLETED_KEY, JSON.stringify(all))
  } catch {
    localStorage.removeItem(COMPLETED_KEY)
  }
}

function parseKeywordTags(value) {
  if (Array.isArray(value)) return value.filter(Boolean)
  if (!value?.trim()) return []
  return value
    .split(/[,;]+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

export function loadDraftFromProposal(proposal) {
  const tags = proposal.keyword_tags
  const keywordTags = Array.isArray(tags) ? tags.join(', ') : ''
  const fileUrl = proposal.file_url || proposal.proposal_file_url || ''

  const form = mergeNested(EMPTY_MM_PROPOSAL_FORM, {
    country: proposal.country || '',
    side: proposal.side || 'side_a',
    sector: proposal.sector || EMPTY_MM_PROPOSAL_FORM.sector,
    engagement_type: proposal.engagement_type || '',
    conference_info: proposal.conference_info || {},
    submitter_info: proposal.submitter_info || proposal.party_a_info || cloneOrg(),
    company_name: proposal.company_name || '',
    company_logo_url: proposal.company_logo_url || '',
    cover_image_url: proposal.cover_image_url || '',
    project_type: proposal.project_type || EMPTY_MM_PROPOSAL_FORM.project_type,
    venture_name: proposal.venture_name || proposal.title || '',
    executive_summary: proposal.executive_summary || {},
    company_overview: proposal.company_overview || {},
    project_overview: proposal.project_overview || {},
    financials: proposal.financials || EMPTY_MM_PROPOSAL_FORM.financials,
    investment_ask: proposal.investment_ask || {},
    contact_info: proposal.contact_info || {},
    proposal_file_url: fileUrl,
    file_url: fileUrl,
    keyword_tags: keywordTags,
    description: proposal.description || '',
  })

  return {
    form,
    step: 1,
    proposalId: proposal.id,
    completedSteps: loadCompletedSteps(proposal.id),
  }
}

export function formToPayload(form, proposalId, { ownerId, ownerField } = {}) {
  const fileUrl = form.file_url || form.proposal_file_url || undefined
  const investmentUsd = form.investment_ask?.total_project_cost_usd

  const payload = {
    side: form.side,
    country: form.country?.trim(),
    sector: form.sector,
    engagement_type: form.engagement_type || undefined,
    company_name: form.company_name?.trim() || undefined,
    venture_name: form.venture_name?.trim() || undefined,
    title: form.venture_name?.trim() || form.company_name?.trim() || undefined,
    description: form.description?.trim() || form.executive_summary?.project_overview || undefined,
    investment_amount: investmentUsd ? Number(investmentUsd) : undefined,
    conference_info: form.conference_info,
    submitter_info: form.submitter_info,
    executive_summary: form.executive_summary,
    company_overview: form.company_overview,
    project_overview: form.project_overview,
    financials: form.financials,
    investment_ask: form.investment_ask,
    contact_info: form.contact_info,
    company_logo_url: form.company_logo_url || undefined,
    cover_image_url: form.cover_image_url || undefined,
    file_url: fileUrl,
    proposal_file_url: fileUrl,
    keyword_tags: parseKeywordTags(form.keyword_tags),
  }

  if (proposalId) payload.proposal_id = proposalId
  if (ownerId && ownerField && !proposalId) payload[ownerField] = ownerId

  return payload
}
