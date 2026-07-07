import { useCallback, useState } from 'react'
import * as activitiesApi from '../../api/activities'
import { getErrorMessage } from '../../utils/format'
import { buildProgressReportTableData } from '../../utils/progressUpdates'
import Alert from '../Alert'
import ProgressReportPreviewModal from './ProgressReportPreviewModal'

export default function ProposalProgressReportActions({
  proposalId,
  proposalLabel,
  previewRows = [],
  previewColumns = [],
  previewUpdates = [],
  className = '',
}) {
  const [exportLoading, setExportLoading] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [exportError, setExportError] = useState('')
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewTableData, setPreviewTableData] = useState(null)
  const [previewCsv, setPreviewCsv] = useState('')

  const handleDownloadReport = useCallback(async () => {
    if (!proposalId) return
    setExportLoading(true)
    setExportError('')
    try {
      await activitiesApi.downloadProgressExport(proposalId, 'xlsx')
    } catch (err) {
      setExportError(getErrorMessage(err))
    } finally {
      setExportLoading(false)
    }
  }, [proposalId])

  const handlePreviewReport = useCallback(async () => {
    if (!proposalId) return
    setPreviewLoading(true)
    setExportError('')
    try {
      const csvText = await activitiesApi.fetchProgressExportPreviewText(proposalId)
      setPreviewTableData(null)
      setPreviewCsv(csvText)
      setPreviewOpen(true)
    } catch (err) {
      if (previewRows.length && previewColumns.length) {
        setPreviewCsv('')
        setPreviewTableData(
          buildProgressReportTableData(previewRows, previewColumns, previewUpdates),
        )
        setPreviewOpen(true)
      } else {
        setExportError(getErrorMessage(err))
      }
    } finally {
      setPreviewLoading(false)
    }
  }, [proposalId, previewRows, previewColumns, previewUpdates])

  return (
    <>
      <ProgressReportPreviewModal
        open={previewOpen}
        csvText={previewCsv}
        tableData={previewTableData}
        title="Progress Report Preview"
        subtitle={
          proposalLabel
            ? `Preview for MOU #${proposalId} — ${proposalLabel}. Download exports Excel (.xlsx).`
            : `Preview for MOU #${proposalId}. Download exports Excel (.xlsx).`
        }
        onClose={() => setPreviewOpen(false)}
        onDownload={handleDownloadReport}
        downloadLoading={exportLoading}
      />

      <div className={className}>
        {exportError && (
          <Alert type="error" message={exportError} onClose={() => setExportError('')} />
        )}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={previewLoading || exportLoading || !proposalId}
            onClick={handlePreviewReport}
            className="shrink-0 rounded-lg border border-portal-primary px-3 py-1.5 text-xs font-semibold text-portal-primary hover:bg-green-50 disabled:opacity-50"
          >
            {previewLoading ? 'Loading…' : 'Preview Report'}
          </button>
          <button
            type="button"
            disabled={exportLoading || previewLoading || !proposalId}
            onClick={handleDownloadReport}
            className="shrink-0 rounded-lg border border-green-700/30 bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-900 hover:bg-green-100 disabled:opacity-50"
          >
            {exportLoading ? 'Preparing…' : 'Download Excel'}
          </button>
        </div>
      </div>
    </>
  )
}
