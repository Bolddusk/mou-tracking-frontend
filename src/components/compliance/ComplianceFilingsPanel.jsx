import { useCallback, useEffect, useRef, useState } from 'react'
import * as complianceApi from '../../api/complianceFilings'
import Alert from '../Alert'
import DocLink from '../DocLink'
import FilePreviewModal from '../FilePreviewModal'
import LoadingSpinner from '../LoadingSpinner'
import Modal from '../Modal'
import { formatDate, getErrorMessage, resolveFileUrl } from '../../utils/format'

const FILING_LABELS = {
  audit_report: 'Audit Report',
  annual_return: 'Annual Return',
}

const ACCEPT_FILES = '.pdf,.doc,.docx,.jpg,.jpeg,.png,.webp'

function MatrixCell({ filing, fiscalYear, filingType, onUpload, onView, onDelete, busy, readOnly }) {
  if (!filing) {
    if (readOnly) {
      return <span className="text-xs text-slate-400">Not uploaded</span>
    }
    return (
      <button
        type="button"
        onClick={() => onUpload(fiscalYear, filingType)}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 hover:border-green-400 hover:bg-green-50 hover:text-green-800 disabled:opacity-50"
      >
        Upload
      </button>
    )
  }

  return (
    <div className="space-y-2">
      <p className="truncate text-xs font-medium text-slate-800" title={filing.original_filename}>
        {filing.original_filename || 'Document'}
      </p>
      <p className="text-[10px] text-slate-500">
        {formatDate(filing.uploaded_at || filing.updated_at)}
        {filing.uploaded_by_name ? ` · ${filing.uploaded_by_name}` : ''}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <DocLink
          url={filing.file_url}
          title={`View ${FILING_LABELS[filingType]}`}
          onOpen={(url) => onView(url, `${FILING_LABELS[filingType]} — FY ${fiscalYear}`)}
        />
        {!readOnly && (
          <>
            <button
              type="button"
              onClick={() => onUpload(fiscalYear, filingType, filing)}
              disabled={busy}
              className="text-xs font-semibold text-green-800 hover:underline disabled:opacity-50"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={() => onDelete(filing)}
              disabled={busy}
              className="text-xs font-semibold text-red-600 hover:underline disabled:opacity-50"
            >
              Delete
            </button>
          </>
        )}
      </div>
    </div>
  )
}

/**
 * @param {'admin' | 'party_a'} mode
 * @param {number} [userId] — required when mode is admin
 * @param {boolean} [readOnly]
 * @param {boolean} [embedded] — compact header for profile page section
 */
export default function ComplianceFilingsPanel({
  mode = 'party_a',
  userId,
  readOnly = false,
  embedded = false,
}) {
  const fileInputRef = useRef(null)
  const [matrix, setMatrix] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [busy, setBusy] = useState(false)
  const [filePreview, setFilePreview] = useState(null)
  const [uploadTarget, setUploadTarget] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [notes, setNotes] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data =
        mode === 'admin'
          ? await complianceApi.getAdminComplianceMatrix(userId)
          : await complianceApi.getProfileComplianceMatrix()
      setMatrix(data)
    } catch (err) {
      setError(getErrorMessage(err))
      setMatrix(null)
    } finally {
      setLoading(false)
    }
  }, [mode, userId])

  useEffect(() => {
    if (mode === 'admin' && !userId) return
    load()
  }, [load, mode, userId])

  const openUpload = (fiscalYear, filingType, existing = null) => {
    if (readOnly) return
    setUploadTarget({ fiscalYear, filingType, existing })
    setSelectedFile(null)
    setNotes(existing?.notes || '')
    setError('')
  }

  const closeUpload = () => {
    setUploadTarget(null)
    setSelectedFile(null)
    setNotes('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleUpload = async () => {
    if (!uploadTarget || !selectedFile) return
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      const formData = new FormData()
      formData.append('document', selectedFile)
      formData.append('fiscal_year', String(uploadTarget.fiscalYear))
      formData.append('filing_type', uploadTarget.filingType)
      if (notes.trim()) formData.append('notes', notes.trim())
      if (mode === 'admin') {
        formData.append('user_id', String(userId))
      }

      const uploadFn =
        mode === 'admin'
          ? complianceApi.uploadAdminComplianceFiling
          : complianceApi.uploadProfileComplianceFiling
      const result = await uploadFn(formData)
      setSuccess(result?.message || 'Filing uploaded')
      closeUpload()
      await load()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      const deleteFn =
        mode === 'admin'
          ? complianceApi.deleteAdminComplianceFiling
          : complianceApi.deleteProfileComplianceFiling
      await deleteFn(deleteTarget.id)
      setSuccess('Filing deleted')
      setDeleteTarget(null)
      await load()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const user = matrix?.user
  const rows = matrix?.matrix || []
  const years = matrix?.required_fiscal_years || rows.map((r) => r.fiscal_year)

  if (mode === 'admin' && !userId) {
    return <p className="text-sm text-slate-500">No organization selected.</p>
  }

  return (
    <div className={embedded ? 'space-y-3' : 'space-y-6'}>
      <Alert type="error" message={error} onClose={() => setError('')} />
      <Alert type="success" message={success} onClose={() => setSuccess('')} />

      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : matrix ? (
        <>
          <div
            className={
              embedded
                ? 'flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm'
                : 'rounded-xl border border-slate-200 bg-white p-6 shadow-sm'
            }
          >
            <div className="min-w-0 flex-1">
              {!embedded && (
                <>
                  <h3 className="text-lg font-semibold text-slate-800">
                    {user?.organization || user?.full_name || 'Organization'}
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">
                    {user?.email}
                    {user?.country ? ` · ${user.country}` : ''}
                  </p>
                </>
              )}
              {embedded && (
                <p className="text-sm text-slate-600">
                  Required for calendar years{' '}
                  {years.length > 0 ? years.join(', ') : '2025, 2024, 2023'} — audit report and
                  annual return per year.
                </p>
              )}
            </div>
            <div className="shrink-0 text-right text-sm">
              <p className="font-semibold text-slate-800">
                {matrix.uploaded_count ?? 0} / {matrix.required_slots ?? 6} uploaded
              </p>
              <p className={matrix.complete ? 'text-green-700' : 'text-amber-700'}>
                {matrix.complete ? 'All filings complete' : `${matrix.missing_count ?? 0} missing`}
              </p>
            </div>
          </div>

          <div
            className={
              embedded
                ? 'w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm'
                : 'overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm'
            }
          >
            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-0 text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="w-24 px-4 py-3 font-semibold sm:w-28">Year</th>
                    <th className="px-4 py-3 font-semibold sm:w-1/2">Audit Report</th>
                    <th className="px-4 py-3 font-semibold sm:w-1/2">Annual Return</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {rows.map((row) => (
                    <tr key={row.fiscal_year} className="align-top">
                      <td className="px-4 py-4 font-semibold text-slate-800">{row.fiscal_year}</td>
                      <td className="px-4 py-4">
                        <MatrixCell
                          filing={row.audit_report}
                          fiscalYear={row.fiscal_year}
                          filingType="audit_report"
                          onUpload={openUpload}
                          onView={(url, title) =>
                            setFilePreview({ url: resolveFileUrl(url), title })
                          }
                          onDelete={setDeleteTarget}
                          busy={busy}
                          readOnly={readOnly}
                        />
                      </td>
                      <td className="px-4 py-4">
                        <MatrixCell
                          filing={row.annual_return}
                          fiscalYear={row.fiscal_year}
                          filingType="annual_return"
                          onUpload={openUpload}
                          onView={(url, title) =>
                            setFilePreview({ url: resolveFileUrl(url), title })
                          }
                          onDelete={setDeleteTarget}
                          busy={busy}
                          readOnly={readOnly}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <p className="text-center text-slate-500">Compliance data not available.</p>
      )}

      {!readOnly && (
        <>
          <Modal
            open={!!uploadTarget}
            title={
              uploadTarget?.existing
                ? `Replace ${FILING_LABELS[uploadTarget.filingType]} — FY ${uploadTarget.fiscalYear}`
                : `Upload ${FILING_LABELS[uploadTarget?.filingType]} — FY ${uploadTarget?.fiscalYear}`
            }
            onClose={closeUpload}
            onConfirm={handleUpload}
            confirmLabel={uploadTarget?.existing ? 'Replace' : 'Upload'}
            confirmDisabled={!selectedFile}
            loading={busy}
          >
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Document</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPT_FILES}
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-green-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-green-800 hover:file:bg-green-100"
                />
                <p className="mt-1 text-xs text-slate-500">
                  PDF, DOC, DOCX, JPG, PNG, WEBP — max 10MB
                </p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Notes (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                  placeholder={mode === 'admin' ? 'Admin note' : 'Optional note'}
                />
              </div>
            </div>
          </Modal>

          <Modal
            open={!!deleteTarget}
            title="Delete filing"
            onClose={() => setDeleteTarget(null)}
            onConfirm={handleDelete}
            confirmLabel="Delete"
            confirmVariant="danger"
            loading={busy}
          >
            <p className="text-sm text-slate-600">
              Remove{' '}
              <strong>
                {FILING_LABELS[deleteTarget?.filing_type] || deleteTarget?.filing_type} — FY{' '}
                {deleteTarget?.fiscal_year}
              </strong>
              {deleteTarget?.original_filename ? ` (${deleteTarget.original_filename})` : ''}? This
              cannot be undone.
            </p>
          </Modal>
        </>
      )}

      <FilePreviewModal
        open={!!filePreview}
        title={filePreview?.title || 'Document'}
        fileUrl={filePreview?.url}
        onClose={() => setFilePreview(null)}
      />
    </div>
  )
}
