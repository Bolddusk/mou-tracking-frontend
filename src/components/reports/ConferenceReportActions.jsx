import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import * as proposalsApi from '../../api/proposals'
import { getErrorMessage } from '../../utils/format'
import { buildSifcReportQuery } from '../../utils/conferenceReportQuery'

export default function ConferenceReportActions({
  conferenceKey,
  conferenceName,
  reportFilters = {},
  onError,
}) {
  const [pdfLoading, setPdfLoading] = useState(false)
  const [xlsxLoading, setXlsxLoading] = useState(false)

  const previewSearch = useMemo(() => {
    // Preview page loads JSON; pass the same Opportunities filters in the URL
    const qs = buildSifcReportQuery({ ...reportFilters })
    return qs ? `?${qs}` : ''
  }, [reportFilters])

  const filterHint = useMemo(() => {
    const keys = Object.keys(reportFilters || {}).filter((k) => {
      const v = reportFilters[k]
      return v != null && String(v).trim() !== '' && String(v) !== 'all'
    })
    return keys.length > 0
  }, [reportFilters])

  if (!conferenceKey) return null

  const handlePdf = async () => {
    setPdfLoading(true)
    try {
      await proposalsApi.downloadConferenceReportPdf(conferenceKey, reportFilters)
    } catch (err) {
      onError?.(getErrorMessage(err))
    } finally {
      setPdfLoading(false)
    }
  }

  const handleXlsx = async () => {
    setXlsxLoading(true)
    try {
      await proposalsApi.downloadConferenceReportXlsx(conferenceKey, reportFilters)
    } catch (err) {
      onError?.(getErrorMessage(err))
    } finally {
      setXlsxLoading(false)
    }
  }

  const busy = pdfLoading || xlsxLoading

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <Link
        to={`/reports/conference/${encodeURIComponent(conferenceKey)}${previewSearch}`}
        className="inline-flex items-center rounded-lg bg-green-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-900"
      >
        Preview SIFC report
      </Link>
      <button
        type="button"
        onClick={handlePdf}
        disabled={busy}
        className="inline-flex items-center rounded-lg border border-green-700/40 bg-white px-3 py-1.5 text-xs font-semibold text-green-900 hover:bg-green-50 disabled:opacity-60"
      >
        {pdfLoading ? 'Opening PDF…' : 'Download SIFC report (PDF)'}
      </button>
      <button
        type="button"
        onClick={handleXlsx}
        disabled={busy}
        className="inline-flex items-center rounded-lg border border-green-700/40 bg-white px-3 py-1.5 text-xs font-semibold text-green-900 hover:bg-green-50 disabled:opacity-60"
      >
        {xlsxLoading ? 'Preparing Excel…' : 'Download SIFC report (Excel)'}
      </button>
      {conferenceName && (
        <span className="text-[11px] text-slate-500">
          Report for {conferenceName}
          {filterHint ? ' (matches table filters)' : ''}
        </span>
      )}
    </div>
  )
}
