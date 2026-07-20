import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import * as proposalsApi from '../../api/proposals'
import Alert from '../../components/Alert'
import ConferenceReportView from '../../components/reports/ConferenceReportView'
import LoadingSpinner from '../../components/LoadingSpinner'
import { useAuth } from '../../context/AuthContext'
import { ROLES } from '../../constants/sectors'
import { getErrorMessage } from '../../utils/format'
import { buildConferenceReportParams } from '../../utils/conferenceReportQuery'

const REPORT_ROLES = new Set([ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.SECTOR_LEAD])

const FILTER_SEARCH_KEYS = [
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

export default function ConferenceReportPage() {
  const { conferenceKey } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user, dashboardPath } = useAuth()
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [xlsxLoading, setXlsxLoading] = useState(false)
  const [error, setError] = useState('')

  const canAccess = REPORT_ROLES.has(user?.role)

  const reportFilters = useMemo(() => {
    const raw = {}
    for (const key of FILTER_SEARCH_KEYS) {
      const value = searchParams.get(key)
      if (value != null && value !== '') raw[key] = value
    }
    return buildConferenceReportParams(raw)
  }, [searchParams])

  const load = useCallback(async () => {
    if (!canAccess) return
    setLoading(true)
    setError('')
    try {
      const data = await proposalsApi.getConferenceReport(conferenceKey || null, reportFilters)
      setReport(data)
    } catch (err) {
      setReport(null)
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [conferenceKey, canAccess, reportFilters])

  useEffect(() => {
    load()
  }, [load])

  const handlePrint = () => window.print()

  const handlePdf = async () => {
    setPdfLoading(true)
    setError('')
    try {
      await proposalsApi.downloadConferenceReportPdf(conferenceKey || null, reportFilters)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setPdfLoading(false)
    }
  }

  const handleXlsx = async () => {
    setXlsxLoading(true)
    setError('')
    try {
      await proposalsApi.downloadConferenceReportXlsx(conferenceKey || null, reportFilters)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setXlsxLoading(false)
    }
  }

  const exportBusy = pdfLoading || xlsxLoading

  if (!canAccess) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <p className="text-sm text-slate-600">Conference reports are not available for your role.</p>
        <Link to={dashboardPath} className="mt-4 inline-block text-sm font-semibold text-portal-primary hover:underline">
          Back to dashboard
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 pb-12 print:bg-white print:pb-0">
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur print:hidden sm:px-6">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              ← Back
            </button>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                SIFC report
                {report?.scope?.filters_applied ? ' · filtered' : ''}
              </p>
              <p className="text-sm font-semibold text-slate-900">
                {report?.conference?.name ||
                  report?.conference?.report_title ||
                  (conferenceKey ? conferenceKey : 'All conferences')}
                {report?.proposal_count != null ? ` · ${report.proposal_count} MOUs` : ''}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handlePrint}
              disabled={loading || !report}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Print
            </button>
            <button
              type="button"
              onClick={handlePdf}
              disabled={loading || exportBusy || !report}
              className="rounded-lg border border-green-700/40 bg-white px-3 py-1.5 text-sm font-semibold text-green-900 hover:bg-green-50 disabled:opacity-50"
            >
              {pdfLoading ? 'Opening PDF…' : 'Download SIFC report (PDF)'}
            </button>
            <button
              type="button"
              onClick={handleXlsx}
              disabled={loading || exportBusy || !report}
              className="rounded-lg bg-green-800 px-3 py-1.5 text-sm font-semibold text-white hover:bg-green-900 disabled:opacity-50"
            >
              {xlsxLoading ? 'Preparing Excel…' : 'Download SIFC report (Excel)'}
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1200px] px-4 pt-6 print:px-0 print:pt-0 sm:px-6">
        <Alert type="error" message={error} onClose={() => setError('')} />

        {loading ? (
          <div className="flex justify-center py-24 print:hidden">
            <LoadingSpinner size="lg" />
          </div>
        ) : report ? (
          <ConferenceReportView report={report} />
        ) : (
          !error && (
            <p className="py-16 text-center text-sm text-slate-500 print:hidden">No report data.</p>
          )
        )}
      </div>
    </div>
  )
}
