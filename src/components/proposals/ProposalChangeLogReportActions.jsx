import { useCallback, useState } from 'react'
import * as proposalsApi from '../../api/proposals'
import { getErrorMessage } from '../../utils/format'
import Alert from '../Alert'
import ChangeLogsReportPreviewModal from './ChangeLogsReportPreviewModal'

export default function ProposalChangeLogReportActions({
  proposalId,
  proposalLabel,
  className = '',
}) {
  const [exportLoading, setExportLoading] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [exportError, setExportError] = useState('')
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewCsv, setPreviewCsv] = useState('')

  const exportOptions = { proposalLabel }

  const handleDownloadReport = useCallback(async () => {
    if (!proposalId) return
    setExportLoading(true)
    setExportError('')
    try {
      await proposalsApi.downloadProposalChangeLogsExport(proposalId, 'xlsx', exportOptions)
    } catch (err) {
      setExportError(getErrorMessage(err))
    } finally {
      setExportLoading(false)
    }
  }, [proposalId, proposalLabel])

  const handlePreviewReport = useCallback(async () => {
    if (!proposalId) return
    setPreviewLoading(true)
    setExportError('')
    try {
      const csvText = await proposalsApi.fetchProposalChangeLogsExportPreviewText(
        proposalId,
        exportOptions,
      )
      setPreviewCsv(csvText)
      setPreviewOpen(true)
    } catch (err) {
      setExportError(getErrorMessage(err))
    } finally {
      setPreviewLoading(false)
    }
  }, [proposalId, proposalLabel])

  return (
    <>
      <ChangeLogsReportPreviewModal
        open={previewOpen}
        csvText={previewCsv}
        title="MOU Change History Report"
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
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={previewLoading || exportLoading || !proposalId}
            onClick={handlePreviewReport}
            className="shrink-0 rounded-lg border border-portal-primary px-4 py-2 text-sm font-semibold text-portal-primary hover:bg-green-50 disabled:opacity-50"
          >
            {previewLoading ? 'Loading…' : 'Preview Report'}
          </button>
          <button
            type="button"
            disabled={exportLoading || previewLoading || !proposalId}
            onClick={handleDownloadReport}
            className="shrink-0 rounded-lg bg-portal-primary px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50"
          >
            {exportLoading ? 'Preparing…' : 'Download Report'}
          </button>
        </div>
      </div>
    </>
  )
}
