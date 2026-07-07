import { useEffect, useRef, useState } from 'react'
import * as proposalsApi from '../../api/proposals'
import { getErrorMessage } from '../../utils/format'

const MOU_FORMATS = [
  { key: 'pdf', label: 'MOU report (PDF)', description: 'Open in browser' },
  { key: 'xlsx', label: 'MOU report (Excel)', description: 'Download .xlsx' },
  { key: 'csv', label: 'MOU report (CSV)', description: 'Download .csv' },
]

const SIFC_FORMATS = [
  { key: 'sifc-xlsx', label: 'SIFC report (Excel)', description: 'MOU Details + Progress history' },
  { key: 'sifc-pdf', label: 'SIFC report (PDF)', description: 'Download PDF' },
]

export default function ProposalExportMenu({ proposalId, onError, className = '' }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(null)
  const rootRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const handleClickOutside = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const handleExport = async (format) => {
    if (!proposalId || loading) return
    setOpen(false)
    setLoading(format)
    try {
      if (format === 'sifc-xlsx') {
        await proposalsApi.downloadProposalSifcReportXlsx(proposalId)
      } else if (format === 'sifc-pdf') {
        await proposalsApi.downloadProposalSifcReportPdf(proposalId)
      } else {
        await proposalsApi.downloadProposalExport(proposalId, format)
      }
    } catch (err) {
      onError?.(getErrorMessage(err))
    } finally {
      setLoading(null)
    }
  }

  return (
    <div ref={rootRef} className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={Boolean(loading)}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
      >
        {loading ? 'Downloading…' : 'Download'}
        <svg
          className={`h-4 w-4 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-1.5 min-w-[14rem] overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {MOU_FORMATS.map((f) => (
            <button
              key={f.key}
              type="button"
              disabled={Boolean(loading)}
              onClick={() => handleExport(f.key)}
              className="flex w-full flex-col items-start px-4 py-2.5 text-left hover:bg-slate-50 disabled:opacity-60"
            >
              <span className="text-sm font-semibold text-slate-800">{f.label}</span>
              <span className="text-xs text-slate-500">{f.description}</span>
            </button>
          ))}
          <div className="my-1 border-t border-slate-100" />
          {SIFC_FORMATS.map((f) => (
            <button
              key={f.key}
              type="button"
              disabled={Boolean(loading)}
              onClick={() => handleExport(f.key)}
              className="flex w-full flex-col items-start px-4 py-2.5 text-left hover:bg-green-50 disabled:opacity-60"
            >
              <span className="text-sm font-semibold text-green-900">{f.label}</span>
              <span className="text-xs text-slate-500">{f.description}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
