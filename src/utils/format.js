function pad2(n) {
  return String(n).padStart(2, '0')
}

/**
 * Parse API calendar dates without off-by-one errors.
 * - Plain `YYYY-MM-DD` → as-is
 * - `…T00:00:00.000Z` → UTC calendar (Postgres DATE)
 * - Other ISO timestamps → local calendar (PK midnight stored as prior UTC day)
 */
function calendarDateParts(value) {
  if (value == null || value === '') return null
  const s = String(value).trim()

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-').map(Number)
    return { y, m, d }
  }

  if (/^\d{4}-\d{2}-\d{2}T00:00:00(\.000)?Z?$/.test(s)) {
    const d = new Date(s)
    if (Number.isNaN(d.getTime())) return null
    return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() }
  }

  const d = new Date(s)
  if (Number.isNaN(d.getTime())) {
    const match = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (!match) return null
    return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) }
  }

  return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() }
}

/** YYYY-MM-DD for `<input type="date">` — handles plain dates and ISO timestamps. */
export function toDateInputValue(value) {
  const parts = calendarDateParts(value)
  if (!parts) return ''
  return `${parts.y}-${pad2(parts.m)}-${pad2(parts.d)}`
}

/** Calendar date display — same parsing rules as toDateInputValue. */
export function formatDateOnly(value) {
  const parts = calendarDateParts(value)
  if (!parts) return value ? formatDate(value) : '—'
  const dt = new Date(parts.y, parts.m - 1, parts.d)
  if (Number.isNaN(dt.getTime())) return '—'
  return dt.toLocaleDateString('en-PK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatDateOnlyRange(start, end) {
  const from = formatDateOnly(start)
  if (from === '—') return '—'
  const to = formatDateOnly(end)
  if (!end || to === '—' || to === from) return from
  return `${from} – ${to}`
}

export function formatDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleDateString('en-PK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/** Date + time — falls back to API pre-formatted PKT strings. */
export function formatDateTime(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString('en-PK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export function formatRelativeTime(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const diffSec = Math.floor((Date.now() - d.getTime()) / 1000)
  if (diffSec < 45) return 'just now'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 7) return `${diffDay}d ago`
  return formatDate(value)
}

export function formatUsd(amount) {
  if (amount == null || amount === '') return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Number(amount))
}

export function getErrorMessage(err) {
  const data = err?.response?.data
  if (data?.code === 'party_a_email_missing' && data?.error) {
    return data.error
  }
  if (data?.error && /invalid.*email|email address/i.test(String(data.error))) {
    return data.error
  }
  return data?.error || err?.message || 'Something went wrong'
}

/** Pakistan matchmaking create APIs are party_a only. */
export function getPkProposalErrorMessage(err) {
  if (err?.response?.status === 403) {
    return 'Only Party A can submit Pakistan matchmaking proposals.'
  }
  return getErrorMessage(err)
}

export function resolveFileUrl(url) {
  if (!url) return url
  if (/^https?:\/\//i.test(url)) return url
  const base = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
  return `${base}${url.startsWith('/') ? url : `/${url}`}`
}
