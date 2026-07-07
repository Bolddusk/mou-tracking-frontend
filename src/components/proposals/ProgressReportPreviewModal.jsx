import { useMemo } from 'react'
import { parseProgressExportCsv } from '../../utils/progressReport'

export default function ProgressReportPreviewModal({
  open,
  csvText,
  tableData,
  onClose,
  onDownload,
  downloadLoading = false,
  title = 'Progress Report Preview',
  subtitle = 'Same columns as the Progress tab and Excel download.',
}) {
  const parsed = useMemo(() => {
    if (tableData?.headers?.length) {
      return {
        summaryLines: [],
        headers: tableData.headers,
        rows: tableData.rows || [],
      }
    }
    return parseProgressExportCsv(csvText || '')
  }, [csvText, tableData])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-label="Close report preview"
      />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={downloadLoading}
              onClick={onDownload}
              className="rounded-lg bg-portal-primary px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50"
            >
              {downloadLoading ? 'Preparing…' : 'Download Excel'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Close
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {parsed.summaryLines.length > 0 && (
            <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              {parsed.summaryLines.map((line) => (
                <p key={line} className="text-sm leading-relaxed text-slate-600">
                  {line}
                </p>
              ))}
            </div>
          )}

          {parsed.headers.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-[960px] w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    {parsed.headers.map((header) => (
                      <th key={header} className="whitespace-nowrap px-3 py-2 font-semibold">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {parsed.rows.map((row, rowIndex) => (
                    <tr key={rowIndex} className="hover:bg-slate-50/80">
                      {parsed.headers.map((header, cellIndex) => (
                        <td
                          key={`${rowIndex}-${header}`}
                          className={`max-w-[320px] px-3 py-2 align-top text-slate-700 ${
                            header.toLowerCase() === 'comments' ? 'min-w-[220px]' : ''
                          }`}
                          title={row[cellIndex]}
                        >
                          <span className="whitespace-pre-wrap break-words">
                            {row[cellIndex] || '—'}
                          </span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsed.rows.length === 0 && (
                <p className="px-4 py-8 text-center text-sm text-slate-500">
                  No progress rows in this report.
                </p>
              )}
            </div>
          ) : (
            <pre className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-4 font-mono text-xs leading-relaxed text-slate-700">
              {csvText || 'No report data.'}
            </pre>
          )}
        </div>
      </div>
    </div>
  )
}
