/** Optional Opportunities filters accepted by GET /api/proposals/conference-report */
const OPTIONAL_REPORT_FILTER_KEYS = [
  'sector',
  'cooperation_mode',
  'sifc_category',
  'mou_lifecycle',
  'date_from',
  'date_to',
  'q',
  'status',
  'archive',
  'archive_filter',
  'include_deleted',
  'archived_only',
]

/**
 * Build conference / SIFC report query params.
 * Same optional filters as Opportunities list (minus page/limit).
 * Empty / "all" values are omitted → full conference report.
 */
export function buildConferenceReportParams({
  conference_key,
  format,
  download,
  ...filters
} = {}) {
  const params = {}
  const confKey = conference_key != null ? String(conference_key).trim() : ''
  // Omit empty / "all" — All conferences report has no conference_key
  if (confKey && confKey.toLowerCase() !== 'all') {
    params.conference_key = confKey
  }
  if (format) params.format = format
  if (download != null && download !== '' && download !== false) {
    params.download = download === true ? 1 : download
  }

  for (const key of OPTIONAL_REPORT_FILTER_KEYS) {
    const value = filters[key]
    if (value == null) continue
    const str = String(value).trim()
    if (!str || str === 'all') continue
    params[key] = value
  }

  return params
}

/** URLSearchParams string for conference-report (Preview / PDF / Excel). */
export function buildSifcReportQuery(filters = {}) {
  const params = buildConferenceReportParams(filters)
  const qs = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    qs.set(key, String(value))
  }
  return qs.toString()
}

/** Strip pagination / conference from list params for report filter state. */
export function reportFiltersFromListParams(listParams = {}) {
  const {
    page: _page,
    limit: _limit,
    conference_key: _conferenceKey,
    ...rest
  } = listParams || {}
  return buildConferenceReportParams(rest)
}
