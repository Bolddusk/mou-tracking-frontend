import { SECTORS } from './sectors'

export const PROJECT_TYPES = ['Greenfield', 'Brownfield']

export const ENGAGEMENT_TYPES = [
  { value: 'G2G', label: 'G2G — Government to Government' },
  { value: 'B2B', label: 'B2B — Business to Business' },
  { value: 'B2G', label: 'B2G — Business to Government' },
  { value: 'G2B', label: 'G2B — Government to Business' },
]

export const ENTITY_TYPES = [
  { value: 'government', label: 'Government' },
  { value: 'business', label: 'Business' },
]

export function suggestedEntityTypes(engagementType) {
  switch (engagementType) {
    case 'G2G':
      return { partyA: 'government', partyB: 'government' }
    case 'B2B':
      return { partyA: 'business', partyB: 'business' }
    case 'B2G':
      return { partyA: 'business', partyB: 'government' }
    case 'G2B':
      return { partyA: 'government', partyB: 'business' }
    default:
      return { partyA: '', partyB: '' }
  }
}

export const TOTAL_STEPS = 11

export const FINANCIAL_METRICS = [
  { key: 'total_revenue', label: 'Total Revenue', category: 'Income Statement', unit: 'PKR Mn' },
  { key: 'ebitda', label: 'EBITDA', category: 'Income Statement', unit: 'PKR Mn' },
  { key: 'net_income', label: 'Net Income', category: 'Income Statement', unit: 'PKR Mn' },
  { key: 'total_assets', label: 'Total Assets', category: 'Balance Sheet', unit: 'PKR Mn' },
  { key: 'total_debt', label: 'Total Debt', category: 'Balance Sheet', unit: 'PKR Mn' },
  { key: 'shareholder_equity', label: 'Shareholder Equity', category: 'Balance Sheet', unit: 'PKR Mn' },
  { key: 'gross_profit_margin', label: 'Gross Profit Margin', category: 'Profitability', unit: '%' },
  { key: 'ebitda_margin', label: 'EBITDA Margin', category: 'Profitability', unit: '%' },
  { key: 'return_on_equity', label: 'Return on Equity (ROE)', category: 'Liquidity & Risk', unit: '%' },
  { key: 'current_ratio', label: 'Current Ratio (Liquidity)', category: 'Liquidity & Risk', unit: 'Ratio' },
  { key: 'debt_to_equity', label: 'Debt-to-Equity', category: 'Liquidity & Risk', unit: 'Ratio' },
]

export function emptyMetrics() {
  return FINANCIAL_METRICS.reduce((acc, m) => ({ ...acc, [m.key]: '' }), {})
}

export const PROPOSAL_STEPS = [
  { num: 1, label: 'Engagement & Conference' },
  { num: 2, label: 'Party A Info' },
  { num: 3, label: 'Party B Info' },
  { num: 4, label: 'Cover' },
  { num: 5, label: 'Executive Summary' },
  { num: 6, label: 'Company Overview' },
  { num: 7, label: 'Project Overview' },
  { num: 8, label: 'Financials' },
  { num: 9, label: 'Investment Ask' },
  { num: 10, label: 'Contact' },
  { num: 11, label: 'MOU' },
]

export const EMPTY_PROPOSAL_FORM = {
  engagement_type: '',
  conference_info: {
    conference_name: '',
    conference_date: '',
    conference_end_date: '',
    conference_location: '',
    conference_host: '',
    conference_description: '',
  },
  party_a_info: {
    entity_type: '',
    organization_name: '',
    department_ministry: '',
    contact_name: '',
    designation: '',
    email: '',
    phone: '',
    country: '',
    city: '',
  },
  party_b_entity_type: '',
  company_name: '',
  company_logo_url: '',
  cover_image_url: '',
  sector: SECTORS[0],
  project_type: PROJECT_TYPES[0],
  venture_name: '',
  executive_summary: {
    company_overview: '',
    project_overview: '',
    project_segment: '',
    sector_alignment: '',
    investment_ask_summary: '',
  },
  company_overview: {
    years_in_operation: '',
    market_standing_pakistan: '',
    key_certifications: '',
    infrastructure_assets: '',
    land_project_capacity: '',
    value_chain_scope: '',
    local_provisions: '',
    export_centricity: '',
  },
  project_overview: {
    core_activity: '',
    site_location: '',
    site_readiness_status: '',
    chinese_technology_sought: '',
    value_addition_goal: '',
    target_production_capacity: '',
    phased_roadmap: '',
    economic_impact: '',
    sustainability_metrics: '',
  },
  financials: {
    years: [{ label: 'FY 20__', metrics: emptyMetrics() }],
    additional_rows: [],
  },
  investment_ask: {
    total_project_cost_usd: '',
    investment_ask_equity_usd: '',
    investment_ask_debt_usd: '',
    sponsor_contribution_type: '',
    sponsor_contribution_amount: '',
    fund_utilization_technology_pct: '',
    fund_utilization_infrastructure_pct: '',
    fund_utilization_working_capital_pct: '',
    projected_irr_pct: '',
    payback_period_years: '',
    milestone_phase_1: '',
    milestone_phase_2: '',
    milestone_phase_3: '',
    sponsor_contribution_pkr_mn: '',
    raising_from_investors_pkr_mn: '',
    total_funds_required_pkr_mn: '',
  },
  contact_info: {
    name: '',
    designation: '',
    email: '',
    cell: '',
    wechat: '',
  },
  proposal_file_url: '',
  party_b_name: '',
  party_b_organization: '',
  party_b_email: '',
  party_b_phone: '',
  party_b_country: '',
  mou_scope: '',
  mou_description: '',
  mou_sector: '',
  mou_demand: '',
  mou_file_url: '',
  conference_key: '',
  sifc_category: '',
  cooperation_mode: 'mou',
}

export function getEngagementLabel(value) {
  if (!value) return ''
  return ENGAGEMENT_TYPES.find((t) => t.value === value)?.label || value
}

export function getProposalDisplayTitle(proposal) {
  if (!proposal) return '—'
  return (
    proposal.venture_name ||
    proposal.pakistani_company ||
    proposal.company_name ||
    proposal.display_title ||
    'Untitled'
  )
}

export function fundUtilizationTotal(investmentAsk) {
  const tech = Number(investmentAsk?.fund_utilization_technology_pct) || 0
  const infra = Number(investmentAsk?.fund_utilization_infrastructure_pct) || 0
  const wc = Number(investmentAsk?.fund_utilization_working_capital_pct) || 0
  return tech + infra + wc
}
