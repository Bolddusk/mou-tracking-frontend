import { parseExecutiveSummary } from './mouConferenceFields'

/**
 * Progress is Progress-tab only — never include in Edit MOU fields form/patch.
 * Only send *changed* keys; blank values for untouched fields must not be in the body
 * (they can overwrite existing server data).
 */
const EXECUTIVE_SUMMARY_FORM_KEYS = [
  'sifc_category',
  'mou_operational_status',
  'bottlenecks',
  'tentative_timeline',
  'action_taken',
  'project_overview',
  'location',
]

const SCALAR_FORM_KEYS = [
  'sector',
  'company_name',
  'party_b_name',
  'cooperation_mode',
  'investment_value_usd',
  'mou_sub_sector',
  'proposal_description',
  'conference_key',
  'external_reference',
]

export function proposalFieldsFormFromProposal(proposal) {
  const es = parseExecutiveSummary(proposal)
  const executive_summary = {}
  for (const key of EXECUTIVE_SUMMARY_FORM_KEYS) {
    executive_summary[key] = es[key] != null ? String(es[key]) : ''
  }

  return {
    sector: proposal?.sector || '',
    company_name: proposal?.company_name || '',
    party_b_name: proposal?.party_b_name || '',
    cooperation_mode: proposal?.cooperation_mode || '',
    investment_value_usd:
      proposal?.investment_value_usd != null ? String(proposal.investment_value_usd) : '',
    mou_sub_sector: proposal?.mou_sub_sector || proposal?.mou_scope || '',
    proposal_description: proposal?.proposal_description || '',
    conference_key: proposal?.conference_key || '',
    external_reference: proposal?.external_reference || '',
    executive_summary,
  }
}

function normalizeScalar(value) {
  if (value == null) return ''
  return String(value).trim()
}

export function buildProposalFieldsPatch(
  baseline,
  current,
  { isAdmin = false, canChangeSector = false } = {},
) {
  const patch = {}

  for (const key of SCALAR_FORM_KEYS) {
    if (key === 'external_reference' && !isAdmin) continue
    if (key === 'sector' && !canChangeSector) continue
    const before = normalizeScalar(baseline[key])
    const after = normalizeScalar(current[key])
    if (before !== after) {
      patch[key] = after
    }
  }

  const esPatch = {}
  for (const key of EXECUTIVE_SUMMARY_FORM_KEYS) {
    const before = normalizeScalar(baseline.executive_summary?.[key])
    const after = normalizeScalar(current.executive_summary?.[key])
    if (before !== after) {
      esPatch[key] = after
    }
  }
  // Defensive: never PATCH progress from this form
  delete esPatch.progress
  if (Object.keys(esPatch).length) {
    patch.executive_summary = esPatch
  }

  return patch
}

/** Merge fields PATCH response without wiping nested executive_summary keys. */
export function mergeProposalAfterFieldsPatch(prev, res) {
  if (!prev) return res?.proposal || prev
  if (!res?.proposal) {
    return res?.capabilities ? { ...prev, capabilities: res.capabilities } : prev
  }

  const next = {
    ...prev,
    ...res.proposal,
    capabilities: res.capabilities || prev.capabilities,
  }

  if (res.proposal.executive_summary != null) {
    next.executive_summary = {
      ...parseExecutiveSummary(prev),
      ...parseExecutiveSummary(res.proposal),
    }
  }

  return next
}
