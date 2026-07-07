import { useState } from 'react'
import * as proposalsApi from '../../api/proposals'
import { getErrorMessage } from '../../utils/format'
import { getSifcReportDisplayTitle, normalizeProposalSifcReport } from '../../utils/proposalSifcReport'
import ProposalSifcReportView from './ProposalSifcReportView'

export default function ProposalSifcReportPreviewModal({
  open,
  report,
  proposalId,
  proposalLabel,
  onClose,
  onError,
}) {
  const [pdfLoading, setPdfLoading] = useState(false)
  const [xlsxLoading, setXlsxLoading] = useState(false)

  if (!open) return null

  const busy = pdfLoading || xlsxLoading
  const title = getSifcReportDisplayTitle(report, proposalLabel)
  const subtitleParts = [
    proposalId != null ? `MOU #${proposalId}` : null,
    'SIFC Report',
    'Preview matches Excel download',
  ].filter(Boolean)

  const handlePdf = async () => {
    if (!proposalId) return
    setPdfLoading(true)
    try {
      await proposalsApi.downloadProposalSifcReportPdf(proposalId)
    } catch (err) {
      onError?.(getErrorMessage(err))
    } finally {
      setPdfLoading(false)
    }
  }

  const handleXlsx = async () => {
    if (!proposalId) return
    setXlsxLoading(true)
    try {
      await proposalsApi.downloadProposalSifcReportXlsx(proposalId)
    } catch (err) {
      onError?.(getErrorMessage(err))
    } finally {
      setXlsxLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-label="Close SIFC report preview"
      />
      <div className="relative z-10 flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
            <p className="mt-1 text-sm text-slate-500">{subtitleParts.join(' · ')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={busy || !proposalId}
              onClick={handleXlsx}
              className="rounded-lg bg-portal-primary px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50"
            >
              {xlsxLoading ? 'Preparing…' : 'Download Excel'}
            </button>
            <button
              type="button"
              disabled={busy || !proposalId}
              onClick={handlePdf}
              className="rounded-lg border border-green-700/40 bg-white px-4 py-2 text-sm font-semibold text-green-900 hover:bg-green-50 disabled:opacity-50"
            >
              {pdfLoading ? 'Preparing…' : 'Download PDF'}
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

        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-100 px-4 py-5 sm:px-6">
          {report ? (
            <ProposalSifcReportView report={report} displayTitle={title} />
          ) : (
            <p className="py-16 text-center text-sm text-slate-500">No report data.</p>
          )}
        </div>
      </div>
    </div>
  )
}
