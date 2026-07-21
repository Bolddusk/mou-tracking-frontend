import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import * as proposalsApi from '../../api/proposals'
import { getErrorMessage } from '../../utils/format'
import { buildSifcReportQuery } from '../../utils/conferenceReportQuery'

export default function ConferenceReportActions({
  conferenceKey = '',
  conferenceName = '',
  reportFilters = {},
  onError,
}) {
  const [pdfLoading, setPdfLoading] = useState(false)
  const [xlsxLoading, setXlsxLoading] = useState(false)

  const key = conferenceKey?.trim() || ''
  const isAllConferences = !key

  const previewTo = useMemo(() => {
    const qs = buildSifcReportQuery({ ...reportFilters })
    const base = key
      ? `/reports/conference/${encodeURIComponent(key)}`
      : '/reports/conference'
    return qs ? `${base}?${qs}` : base
  }, [key, reportFilters])

  const filterHint = useMemo(() => {
    const keys = Object.keys(reportFilters || {}).filter((k) => {
      const v = reportFilters[k]
      return v != null && String(v).trim() !== '' && String(v) !== 'all'
    })
    return keys.length > 0
  }, [reportFilters])

  const handlePdf = async () => {
    setPdfLoading(true)
    try {
      await proposalsApi.downloadConferenceReportPdf(key || null, reportFilters)
    } catch (err) {
      onError?.(getErrorMessage(err))
    } finally {
      setPdfLoading(false)
    }
  }

  const handleXlsx = async () => {
    setXlsxLoading(true)
    try {
      await proposalsApi.downloadConferenceReportXlsx(key || null, reportFilters)
    } catch (err) {
      onError?.(getErrorMessage(err))
    } finally {
      setXlsxLoading(false)
    }
  }

  const busy = pdfLoading || xlsxLoading
  const scopeLabel = isAllConferences ? 'All conferences' : conferenceName || key

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-green-100 bg-white/70 px-3 py-2">
      <span className="text-[11px] text-slate-500">
        SIFC report · {scopeLabel}
        {filterHint ? ' (table filters)' : ''}
      </span>
      <div className="flex flex-wrap items-center gap-1.5 sm:ml-auto">
        <Link
          to={previewTo}
          className="inline-flex items-center rounded-md border border-green-700/30 bg-white px-2.5 py-1 text-xs font-semibold text-green-900 hover:bg-green-50"
        >
          Preview
        </Link>
        <button
          type="button"
          onClick={handlePdf}
          disabled={busy}
          className="inline-flex items-center rounded-md border border-green-700/30 bg-white px-2.5 py-1 text-xs font-semibold text-green-900 hover:bg-green-50 disabled:opacity-60"
        >
          {pdfLoading ? 'PDF…' : 'PDF'}
        </button>
        <button
          type="button"
          onClick={handleXlsx}
          disabled={busy}
          className="inline-flex items-center rounded-md border border-green-700/30 bg-white px-2.5 py-1 text-xs font-semibold text-green-900 hover:bg-green-50 disabled:opacity-60"
        >
          {xlsxLoading ? 'Excel…' : 'Excel'}
        </button>
      </div>
    </div>
  )
}
