import { useCallback, useEffect, useMemo, useState } from 'react'
import * as proposalsApi from '../../api/proposals'
import Alert from '../Alert'
import { useAuth } from '../../context/AuthContext'
import { ROLES } from '../../constants/sectors'
import { getErrorMessage } from '../../utils/format'
import {
  EMPTY_ADMIN_CHANGE_LOG_FILTERS,
  EMPTY_SECTOR_CHANGE_LOG_FILTERS,
  hasActiveChangeLogFilters,
} from '../../utils/changeLogFilters'
import ChangeLogsFilterBar from './ChangeLogsFilterBar'
import ChangeLogsReportPreviewModal from './ChangeLogsReportPreviewModal'
import ProposalChangeLogTimeline from './ProposalChangeLogTimeline'

function getExportFormat(listFilters, filterVariant) {
  return hasActiveChangeLogFilters(listFilters, filterVariant) ? 'xlsx' : 'csv'
}

export default function MouChangeLogsPanel() {
  const { user } = useAuth()
  const isAdminViewer = user?.role === ROLES.SUPER_ADMIN || user?.role === ROLES.ADMIN
  const isSectorLead = user?.role === ROLES.SECTOR_LEAD

  const [filterOptions, setFilterOptions] = useState(null)
  const [adminFilters, setAdminFilters] = useState(EMPTY_ADMIN_CHANGE_LOG_FILTERS)
  const [sectorFilters, setSectorFilters] = useState(EMPTY_SECTOR_CHANGE_LOG_FILTERS)
  const [debouncedQ, setDebouncedQ] = useState('')
  const [exportLoading, setExportLoading] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [exportError, setExportError] = useState('')
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewCsv, setPreviewCsv] = useState('')

  const filterVariant = isAdminViewer ? 'admin' : 'sector'
  const qSource = (isAdminViewer ? adminFilters : sectorFilters).q

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(qSource), 300)
    return () => clearTimeout(timer)
  }, [qSource])

  useEffect(() => {
    let cancelled = false
    proposalsApi
      .getChangeLogsFilterOptions()
      .then((data) => {
        if (!cancelled) setFilterOptions(data)
      })
      .catch(() => {
        if (!cancelled) {
          setFilterOptions({
            sector_leads: [],
            sectors: [],
            mou_statuses: [],
            changed_by_roles: [],
            scoped_sectors: [],
          })
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  const listFilters = useMemo(() => {
    if (isAdminViewer) {
      return { ...adminFilters, q: debouncedQ }
    }
    if (isSectorLead) {
      return { ...sectorFilters, q: debouncedQ }
    }
    return {}
  }, [isAdminViewer, isSectorLead, adminFilters, sectorFilters, debouncedQ])

  const handleDownloadReport = useCallback(async () => {
    setExportLoading(true)
    setExportError('')
    try {
      const format = isAdminViewer || isSectorLead
        ? getExportFormat(listFilters, filterVariant)
        : 'csv'
      await proposalsApi.downloadChangeLogsExport(listFilters, format)
    } catch (err) {
      setExportError(getErrorMessage(err))
    } finally {
      setExportLoading(false)
    }
  }, [isAdminViewer, isSectorLead, listFilters, filterVariant])

  const handlePreviewReport = useCallback(async () => {
    setPreviewLoading(true)
    setExportError('')
    try {
      const csvText = await proposalsApi.fetchChangeLogsExportPreviewText(listFilters)
      setPreviewCsv(csvText)
      setPreviewOpen(true)
    } catch (err) {
      setExportError(getErrorMessage(err))
    } finally {
      setPreviewLoading(false)
    }
  }, [listFilters])

  const reportActions = (
    <ChangeLogsReportPreviewModal
      open={previewOpen}
      csvText={previewCsv}
      onClose={() => setPreviewOpen(false)}
      onDownload={handleDownloadReport}
      downloadLoading={exportLoading}
    />
  )

  if (isAdminViewer) {
    return (
      <div className="space-y-3 p-4 sm:p-6">
        <Alert type="error" message={exportError} onClose={() => setExportError('')} />
        {reportActions}
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <ChangeLogsFilterBar
            variant="admin"
            filters={adminFilters}
            onChange={setAdminFilters}
            filterOptions={filterOptions}
            onClear={() => setAdminFilters(EMPTY_ADMIN_CHANGE_LOG_FILTERS)}
            onPreview={handlePreviewReport}
            onDownload={handleDownloadReport}
            previewLoading={previewLoading}
            downloadLoading={exportLoading}
          />
          <ProposalChangeLogTimeline source="recent" enabled listFilters={listFilters} />
        </section>
      </div>
    )
  }

  if (isSectorLead) {
    return (
      <div className="space-y-3 p-4 sm:p-6">
        <Alert type="error" message={exportError} onClose={() => setExportError('')} />
        {reportActions}
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <ChangeLogsFilterBar
            variant="sector"
            filters={sectorFilters}
            onChange={setSectorFilters}
            filterOptions={filterOptions}
            onClear={() => setSectorFilters(EMPTY_SECTOR_CHANGE_LOG_FILTERS)}
            onPreview={handlePreviewReport}
            onDownload={handleDownloadReport}
            previewLoading={previewLoading}
            downloadLoading={exportLoading}
          />
          <ProposalChangeLogTimeline source="sector" enabled listFilters={listFilters} />
        </section>
      </div>
    )
  }

  return (
    <div className="space-y-3 p-4 sm:p-6">
      <Alert type="error" message={exportError} onClose={() => setExportError('')} />
      {reportActions}
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">My Change History</h2>
            <p className="text-sm text-slate-500">Changes you made across MOUs you can access</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={previewLoading || exportLoading}
              onClick={handlePreviewReport}
              className="shrink-0 rounded-lg border border-portal-primary px-4 py-2 text-sm font-semibold text-portal-primary hover:bg-green-50 disabled:opacity-50"
            >
              {previewLoading ? 'Loading…' : 'Preview Report'}
            </button>
            <button
              type="button"
              disabled={exportLoading || previewLoading}
              onClick={handleDownloadReport}
              className="shrink-0 rounded-lg bg-portal-primary px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50"
            >
              {exportLoading ? 'Preparing…' : 'Download Report'}
            </button>
          </div>
        </div>
        <ProposalChangeLogTimeline source="mine" enabled />
      </section>
    </div>
  )
}
