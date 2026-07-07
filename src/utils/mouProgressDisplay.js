/** Parse MOU progress text like `[7 Jul 2026, 12:50 pm] update body`. */
export function parseMouProgressText(value) {
  const raw = String(value ?? '').trim()
  if (!raw || raw === '—') return { entries: [], raw: '' }

  const lines = raw
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)

  const entries = lines.map((line) => {
    const match = line.match(/^\[([^\]]+)\]\s*(.*)$/s)
    if (match) {
      return { timestamp: match[1].trim(), body: match[2].trim() }
    }
    return { timestamp: '', body: line }
  })

  return { entries, raw }
}

export function getLatestMouProgressEntry(value) {
  const { entries } = parseMouProgressText(value)
  if (!entries.length) return null
  return entries[entries.length - 1]
}
