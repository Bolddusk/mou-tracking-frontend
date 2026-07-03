import { parseExecutiveSummary } from './mouConferenceFields'

const EXECUTIVE_SUMMARY_FORM_KEYS = [
  'sifc_category',
  'mou_operational_status',
  'progress',
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
  'conference_name',
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
    conference_name: proposal?.conference_name || '',
    external_reference: proposal?.external_reference || '',
    executive_summary,
    party_a_info: {
      organization_name:
        proposal?.party_a_info?.organization_name || proposal?.company_name || '',
    },
  }
}

function normalizeScalar(value) {
  if (value == null) return ''
  return String(value).trim()
}

export function buildProposalFieldsPatch(baseline, current, { isAdmin = false } = {}) {
  const patch = {}

  for (const key of SCALAR_FORM_KEYS) {
    if (key === 'external_reference' && !isAdmin) continue
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
  if (Object.keys(esPatch).length) {
    patch.executive_summary = esPatch
  }

  const orgBefore = normalizeScalar(baseline.party_a_info?.organization_name)
  const orgAfter = normalizeScalar(current.party_a_info?.organization_name)
  if (orgBefore !== orgAfter) {
    patch.party_a_info = { organization_name: orgAfter }
  }

  return patch
}
