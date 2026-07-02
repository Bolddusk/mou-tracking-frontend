import { COOPERATION_MODE_LABELS } from '../constants/proposalFilters'

export function findConferenceByKey(conferences, conferenceKey) {
  if (!conferenceKey || !Array.isArray(conferences)) return null
  return conferences.find((c) => c.key === conferenceKey) || null
}

/** From GET /api/proposals/filter-options → conferences[].show_mou_detail_columns / is_historic */
export function conferenceShowsHistoricMouColumns(conference) {
  if (!conference) return false
  return (
    conference.show_mou_detail_columns === true ||
    conference.is_historic === true ||
    conference.ui_variant === 'historic_mou'
  )
}

export function conferenceShowsHistoricMouColumnsByKey(conferenceKey, conferences = []) {
  return conferenceShowsHistoricMouColumns(findConferenceByKey(conferences, conferenceKey))
}

export function getConferenceDisplayTitle(conference) {
  if (!conference) return null
  return conference.short_name || conference.display_name || conference.name || conference.key
}

export function parseExecutiveSummary(proposal) {
  const raw = proposal?.executive_summary
  if (!raw) return {}
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      return typeof parsed === 'object' && parsed ? parsed : {}
    } catch {
      return {}
    }
  }
  return {}
}

export function displayOrDash(value) {
  if (value == null) return '—'
  const text = String(value).trim()
  return text || '—'
}

export function formatMouValueUsd(value) {
  if (value == null || value === '') return '—'
  const n = Number(value)
  if (Number.isNaN(n)) return displayOrDash(value)
  return `USD ${n} million`
}

export function getCooperationModeLabel(proposal) {
  const mode = proposal?.cooperation_mode
  if (!mode) return '—'
  return COOPERATION_MODE_LABELS[mode] || mode.replace(/_/g, ' ')
}

export function getChineseCompany(proposal) {
  return displayOrDash(
    proposal?.party_b_name || proposal?.party_b_organization || proposal?.party_b_info?.organization_name,
  )
}

export function getPakistaniCompany(proposal) {
  return displayOrDash(
    proposal?.company_name || proposal?.party_a_info?.organization_name || proposal?.party_a_name,
  )
}

export function getMouConferenceRow(proposal) {
  const es = parseExecutiveSummary(proposal)
  const outcome = proposal?.proposal_description?.trim() || es.project_overview?.trim() || ''

  return {
    chineseCompany: getChineseCompany(proposal),
    pakistaniCompany: getPakistaniCompany(proposal),
    sifcCategory: displayOrDash(es.sifc_category),
    agricultureSubSector: displayOrDash(proposal?.mou_sub_sector || proposal?.mou_scope),
    cooperationMode: getCooperationModeLabel(proposal),
    mouValue: formatMouValueUsd(proposal?.investment_value_usd),
    outcome: displayOrDash(outcome),
    operationalStatus: displayOrDash(es.mou_operational_status),
    progress: displayOrDash(es.progress),
    bottlenecks: displayOrDash(es.bottlenecks),
    tentativeTimeline: displayOrDash(es.tentative_timeline),
    sector: displayOrDash(proposal?.sector),
    mouLifecycleLabel: displayOrDash(proposal?.mou_lifecycle_label || proposal?.mou_lifecycle),
  }
}

export function shouldShowConferenceMouDetails(proposal, conferences = []) {
  if (!proposal) return false
  if (proposal.is_historic_mou || proposal.show_mou_detail_columns) return true

  const conf = findConferenceByKey(conferences, proposal.conference_key)
  if (conferenceShowsHistoricMouColumns(conf)) return true

  const row = getMouConferenceRow(proposal)
  return (
    row.sifcCategory !== '—' ||
    row.operationalStatus !== '—' ||
    row.progress !== '—' ||
    row.bottlenecks !== '—' ||
    proposal?.investment_value_usd != null
  )
}

export function getOpportunitiesDashboardHeader({
  selectedConference,
  listScope,
  pageTitle,
  scopedSector,
}) {
  if (selectedConference && conferenceShowsHistoricMouColumns(selectedConference)) {
    const count = selectedConference.proposal_count
    return {
      variant: 'historic_conference',
      showSuperAdminExtras: false,
      showMatchmakingLinks: false,
      badge: 'Conference MOUs',
      eyebrow: 'Historic imported records',
      title: getConferenceDisplayTitle(selectedConference),
      description:
        count != null
          ? `${count} MOUs from this conference. Use MOU Status for Active, In Execution, or Inactive.`
          : 'Imported conference MOUs. Use MOU Status for Active, In Execution, or Inactive.',
    }
  }

  if (listScope === 'sector') {
    return {
      variant: 'scoped',
      showSuperAdminExtras: false,
      showMatchmakingLinks: true,
      badge: 'Sector Opportunities',
      eyebrow: null,
      title: pageTitle,
      description: `Proposals in ${scopedSector || 'your sector'} — open any listed MOU without permission errors.`,
    }
  }

  if (listScope === 'own') {
    return {
      variant: 'scoped',
      showSuperAdminExtras: false,
      showMatchmakingLinks: true,
      badge: 'My Opportunities',
      eyebrow: null,
      title: pageTitle,
      description: 'Your proposals — only MOUs you can access are listed here.',
    }
  }

  return {
    variant: 'default',
    showSuperAdminExtras: true,
    showMatchmakingLinks: true,
    badge: 'Super Admin',
    eyebrow: 'Direct Opportunities',
    title: pageTitle,
    description:
      'Legacy proposals across all sectors — approve, reject, and monitor. To create a new MOUS, use Add MOUS on the MOUS page in the sidebar.',
  }
}

export function normalizeMouLifecycleStatuses(statuses) {
  if (!Array.isArray(statuses) || !statuses.length) return null
  return statuses.map((s) => {
    if (typeof s === 'string') {
      const label =
        s === 'execution' ? 'In Execution' : s.charAt(0).toUpperCase() + s.slice(1)
      return { value: s, label }
    }
    if (s.value === 'execution' && !s.label?.toLowerCase().includes('execution')) {
      return { ...s, label: 'In Execution' }
    }
    return s
  })
}
