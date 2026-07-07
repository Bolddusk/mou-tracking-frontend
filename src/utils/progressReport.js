/** Parse full CSV text including newlines inside quoted cells (e.g. multi-line comments). */
function parseCsvRecords(text) {
  const rows = []
  let row = []
  let cell = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"'
          i += 1
        } else {
          inQuotes = false
        }
      } else {
        cell += ch
      }
      continue
    }

    if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      row.push(cell.trim())
      cell = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i += 1
      row.push(cell.trim())
      if (row.some((c) => c !== '')) rows.push(row)
      row = []
      cell = ''
    } else {
      cell += ch
    }
  }

  if (cell || row.length) {
    row.push(cell.trim())
    if (row.some((c) => c !== '')) rows.push(row)
  }

  return rows
}

function isProgressHeaderRow(row) {
  if (!row?.length) return false
  const normalized = row.map((c) => String(c || '').trim().toLowerCase())
  return (
    normalized.includes('progress date') ||
    normalized[0] === 'progress date' ||
    (normalized.includes('title') && normalized.includes('description'))
  )
}

function isHiddenProgressColumn(header) {
  const normalized = String(header || '').trim().toLowerCase()
  return normalized === 'support file url' || normalized === 'support_file_url'
}

function filterHiddenColumns(headers, rows) {
  const hiddenIndexes = headers
    .map((h, i) => (isHiddenProgressColumn(h) ? i : -1))
    .filter((i) => i >= 0)

  return {
    headers: headers.filter((_, i) => !hiddenIndexes.includes(i)),
    rows: rows.map((row) => row.filter((_, i) => !hiddenIndexes.includes(i))),
  }
}

/** Parse GET /api/proposals/:id/progress/export?format=csv for table preview. */
export function parseProgressExportCsv(text) {
  if (!text?.trim()) return { summaryLines: [], headers: [], rows: [] }

  const parsed = parseCsvRecords(text)
  const headerIndex = parsed.findIndex(isProgressHeaderRow)

  if (headerIndex === -1) {
    if (parsed[0]?.length > 1) {
      const { headers, rows } = filterHiddenColumns(
        parsed[0],
        parsed.slice(1).filter((row) => row.some((cell) => cell)),
      )
      return { summaryLines: [], headers, rows }
    }
    return { summaryLines: text.split(/\r?\n/).filter((l) => l.trim()), headers: [], rows: [] }
  }

  const { headers, rows } = filterHiddenColumns(
    parsed[headerIndex],
    parsed.slice(headerIndex + 1).filter((row) => row.some((cell) => cell)),
  )

  const summaryLines = parsed
    .slice(0, headerIndex)
    .map((row) => row.join(', '))
    .filter(Boolean)

  return { summaryLines, headers, rows }
}
