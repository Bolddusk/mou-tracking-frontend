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

export function formatUsd(amount) {
  if (amount == null || amount === '') return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Number(amount))
}

export function getErrorMessage(err) {
  return err?.response?.data?.error || err?.message || 'Something went wrong'
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
