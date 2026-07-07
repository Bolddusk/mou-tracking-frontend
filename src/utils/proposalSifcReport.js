import { ROLE_LABELS } from '../constants/sectors'
import { formatDate } from './format'
import { formatProgressSource } from './progressUpdates'

export const DEFAULT_SIFC_PROGRESS_COLUMNS = [
  { key: 'progress_date', label: 'Progress Date' },
  { key: 'title', label: 'Title' },
  { key: 'description', label: 'Description' },
  { key: 'source', label: 'Source' },
  { key: 'added_by_name', label: 'Added By' },
  { key: 'added_by_role', label: 'Added By Role' },
  { key: 'synced_fields', label: 'Synced Fields' },
  { key: 'comments', label: 'Comments' },
  { key: 'support_file_url', label: 'Support File URL' },
]

const MOU_DETAIL_LABELS = {
  pakistani_company: 'Pakistani Company',
  chinese_company: 'Chinese Company',
  sifc_category: 'SIFC Category',
  sector: 'Sector',
  cooperation_mode: 'Cooperation Mode',
  proposal_id: 'Proposal ID',
  conference: 'Conference',
  current_status: 'Current Status',
  action_taken: 'Action Taken',
  workflow_status: 'Workflow Status',
  submitted_at: 'Submitted At',
  mou_value: 'MOU Value',
  investment_value_usd: 'MoU Value',
  operational_status: 'Status',
  mou_operational_status: 'Status',
  status: 'Status',
  outcome: 'Outcome / Description',
  outcome_description: 'Outcome / Description',
  proposal_description: 'Outcome / Description',
  progress: 'Progress',
  bottlenecks: 'Bottleneck',
  bottleneck: 'Bottleneck',
  tentative_timeline: 'Tentative Timelines',
  tentative_timelines: 'Tentative Timelines',
  location: 'Location',
  conference_name: 'Conference',
  conference_key: 'Conference Key',
  party_a_contact: 'Party A Contact',
  party_b_contact: 'Party B Contact',
  contacts: 'Contacts',
  party_a_contacts: 'Party A Contacts',
  party_b_contacts: 'Party B Contacts',
}

function humanizeKey(key) {
  return String(key)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (ch) => ch.toUpperCase())
}

function formatDetailValue(value) {
  if (value == null || value === '') return '—'
  if (Array.isArray(value)) {
    if (!value.length) return '—'
    if (typeof value[0] === 'object') {
      return value
        .map((item) => {
          if (item?.label != null) return `${item.label}: ${item.value ?? '—'}`
          return JSON.stringify(item)
        })
        .join('\n')
    }
    return value.join(', ')
  }
  if (typeof value === 'object') {
    return Object.entries(value)
      .map(([k, v]) => `${humanizeKey(k)}: ${v ?? '—'}`)
      .join('\n')
  }
  return String(value)
}

export function normalizeMouDetailsForDisplay(mouDetails) {
  if (!mouDetails) return []

  if (Array.isArray(mouDetails)) {
    return mouDetails.map(mapMouDetailRow)
  }

  if (Array.isArray(mouDetails.fields)) {
    return mouDetails.fields.map(mapMouDetailRow)
  }

  const preferredOrder = [
    'proposal_id',
    'conference',
    'conference_name',
    'chinese_company',
    'pakistani_company',
    'sifc_category',
    'sector',
    'cooperation_mode',
    'mou_value',
    'investment_value_usd',
    'operational_status',
    'mou_operational_status',
    'status',
    'outcome',
    'outcome_description',
    'proposal_description',
    'progress',
    'bottlenecks',
    'bottleneck',
    'tentative_timeline',
    'tentative_timelines',
    'location',
    'current_status',
    'action_taken',
    'party_a_contact',
    'party_b_contact',
    'contacts',
    'party_a_contacts',
    'party_b_contacts',
    'workflow_status',
    'submitted_at',
  ]

  const entries = Object.entries(mouDetails).filter(
    ([, value]) => value != null && value !== '',
  )

  const sortIndex = (key) => {
    const idx = preferredOrder.indexOf(key)
    return idx === -1 ? preferredOrder.length + 1 : idx
  }

  return entries
    .sort(([a], [b]) => sortIndex(a) - sortIndex(b) || a.localeCompare(b))
    .map(([key, value]) => ({
      label: MOU_DETAIL_LABELS[key] || humanizeKey(key),
      value: formatDetailValue(value),
    }))
}

export function formatSifcProgressCell(key, value) {
  if (value == null || value === '') return '—'

  if (key === 'progress_date') {
    const raw = String(value)
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10)
    return formatDate(value) || raw
  }

  if (key === 'source') {
    return formatProgressSource(value) || String(value)
  }

  if (key === 'added_by_role') {
    return ROLE_LABELS[value] || String(value)
  }

  if (key === 'synced_fields') {
    if (typeof value === 'string') return value
    if (Array.isArray(value)) {
      return value
        .map((field) => {
          const label = field.label || field.field || 'Field'
          return `${label}: ${field.old_value ?? '—'} → ${field.new_value ?? '—'}`
        })
        .join('\n')
    }
    return String(value)
  }

  if (key === 'comments' || key === 'description') {
    return String(value)
  }

  return String(value)
}

function mapMouDetailRow(item) {
  const label = item.label || item.field || item.key || item.name || '—'
  const rawValue = item.value ?? item.text ?? item.content
  return {
    label,
    value: formatDetailValue(rawValue),
  }
}

function buildMouSheetHeaders(report, mouFields, proposalLabel) {
  const apiTitle = report.mou_details_title || report.mou_sheet_title
  if (apiTitle?.trim()) {
    const apiSubtitle = (report.mou_details_subtitle || report.conference_name || '').trim()
    const title = apiTitle.trim()
    return {
      title,
      subtitle: apiSubtitle && apiSubtitle !== title ? apiSubtitle : '',
    }
  }

  const conferenceFull =
    report.conference_name ||
    report.mou_details?.conference ||
    report.mou_details?.conference_name ||
    report.conference?.name ||
    mouFields.find((f) => f.label === 'Conference')?.value ||
    ''

  const conferenceShort =
    report.conference_short_name ||
    report.mou_details?.conference_short ||
    report.conference?.short_name ||
    ''

  const pakistani =
    report.mou_details?.pakistani_company ||
    mouFields.find((f) => f.label === 'Pakistani Company')?.value ||
    ''

  let title = ''
  if (conferenceShort && pakistani) {
    title = `${conferenceShort} — MOU Snapshot — ${pakistani}`
  } else if (conferenceFull && pakistani) {
    title = `${conferenceFull} — MOU Snapshot — ${pakistani}`
  } else if (pakistani) {
    title = `MOU Snapshot — ${pakistani}`
  } else {
    title = getSifcReportDisplayTitle(report, proposalLabel)
  }

  const subtitle =
    conferenceFull && conferenceFull !== title && !title.includes(conferenceFull)
      ? conferenceFull
      : ''

  return { title, subtitle }
}

export function getSifcReportDisplayTitle(report, proposalLabel) {
  if (proposalLabel?.trim()) return proposalLabel.trim()

  const fromReport =
    report?.proposal_title ||
    report?.proposal?.title ||
    report?.proposal?.venture_name ||
    report?.mou_title
  if (fromReport?.trim()) return fromReport.trim()

  const details = report?.mou_details
  if (details && typeof details === 'object' && !Array.isArray(details)) {
    const chinese = details.chinese_company || details.chineseCompany
    const pakistani = details.pakistani_company || details.pakistaniCompany
    const combined = [chinese, pakistani].filter(Boolean).join(' / ')
    if (combined) return combined
  }

  const id = report?.proposal_id || report?.proposal?.id
  return id != null ? `MOU #${id}` : 'SIFC Report'
}

export function normalizeProposalSifcReport(report, proposalLabel) {
  if (!report) {
    return {
      isLegacy: false,
      mouFields: [],
      progressColumns: [],
      progressRows: [],
      meta: {},
      mouSheet: {},
    }
  }

  const isLegacy = Boolean(report.snapshot || report.sections) && !report.mou_details

  const progressRows = Array.isArray(report.progress_rows) ? report.progress_rows : []
  const mouFields = Array.isArray(report.mou_detail_rows)
    ? report.mou_detail_rows.map(mapMouDetailRow)
    : normalizeMouDetailsForDisplay(report.mou_details)

  const mouSheet = buildMouSheetHeaders(report, mouFields, proposalLabel)

  return {
    isLegacy,
    mouFields,
    progressColumns:
      Array.isArray(report.progress_columns) && report.progress_columns.length
        ? report.progress_columns
        : DEFAULT_SIFC_PROGRESS_COLUMNS,
    progressRows,
    mouSheet,
    meta: {
      title: getSifcReportDisplayTitle(report, proposalLabel),
      proposalId: report.proposal_id || report.proposal?.id,
      generatedAt: report.generated_at,
      generatedBy: report.generated_by_name || report.generated_by?.name,
      progressSheetTitle: `Progress Updates (${progressRows.length})`,
    },
  }
}
