import { useCallback, useEffect, useState } from 'react'
import * as mmApi from '../../api/matchmaking'
import * as proposalsApi from '../../api/proposals'
import Alert from '../Alert'
import FilePreviewModal from '../FilePreviewModal'
import LoadingSpinner from '../LoadingSpinner'
import Modal from '../Modal'
import { MM_MOU_STATUS_LABELS, MM_MOU_STATUS_ORDER } from '../../constants/matchmaking'
import { formatDate, getErrorMessage, resolveFileUrl } from '../../utils/format'
import { displayOrDash, formatMouValueUsd } from '../../utils/mouConferenceFields'
import MmMouStatusBadge from './MmMouStatusBadge'
import CloseDealButton from './CloseDealButton'
import MouAcknowledgmentPanel from './MouAcknowledgmentPanel'
import { MouVersionBadge } from './MouVersionHistory'

const EMPTY_FORM = {
  mou_scope: '',
  mou_description: '',
  mou_sector: '',
  mou_demand: '',
}

export default function MmMouPanel({
  matchId,
  proposalId,
  proposal = null,
  canEdit = true,
  canUploadMou,
  canEditMouFields,
  canMarkSigned = false,
  canCloseDeal = false,
  onStatusChange,
  onDealClosed,
}) {
  const isDirectProposal = Boolean(proposalId && !matchId)
  const [mouData, setMouData] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [mouFile, setMouFile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [warning, setWarning] = useState('')
  const [filePreview, setFilePreview] = useState(null)
  const [markSigned, setMarkSigned] = useState(false)
  const [ackRefresh, setAckRefresh] = useState(0)
  const [ackStatus, setAckStatus] = useState(null)
  const [currentVersion, setCurrentVersion] = useState(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deletingFile, setDeletingFile] = useState(false)

  const handleAckStatusLoaded = useCallback(
    (data) => {
      setAckStatus(data)
      onStatusChange?.(data?.mou_status)
      setCurrentVersion(
        data?.current_version ??
          data?.versions?.find((v) => v.is_current)?.version_number ??
          null,
      )
    },
    [onStatusChange],
  )

  const load = useCallback(async () => {
    if (!matchId && !proposalId) return
    setLoading(true)
    setError('')
    try {
      const data = isDirectProposal
        ? await proposalsApi.getProposalMou(proposalId)
        : await mmApi.getMatchMou(matchId)
      setMouData(data)
      const mou = data?.mou || {}
      setForm({
        mou_scope: mou.mou_scope || '',
        mou_description: mou.mou_description || '',
        mou_sector: mou.mou_sector || '',
        mou_demand: mou.mou_demand || '',
      })
      onStatusChange?.(data?.mou_status)
      setAckRefresh((n) => n + 1)
    } catch (err) {
      setError(getErrorMessage(err))
      setMouData(null)
    } finally {
      setLoading(false)
    }
  }, [matchId, proposalId, isDirectProposal, onStatusChange])

  useEffect(() => {
    load()
  }, [load])

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setSuccess('')
    setWarning('')
    const hadFileUpload = Boolean(mouFile)
    const uploadAllowed = resolvedCanUploadMou
    const fieldsEditable = resolvedCanEditMouFields

    if (!fieldsEditable && !hadFileUpload) {
      setError('Select a MOU file to upload.')
      setSaving(false)
      return
    }

    try {
      // Source of truth for Sector / Demand / Outcome is Details — only Scope (+ signed) here
      const fields = fieldsEditable
        ? { mou_scope: form.mou_scope }
        : {}
      if (markSigned && fieldsEditable) fields.mou_status = 'signed'
      const res = isDirectProposal
        ? await proposalsApi.saveProposalMou(proposalId, fields, uploadAllowed ? mouFile : null)
        : await mmApi.saveMatchMou(matchId, fields, uploadAllowed ? mouFile : null)

      if (hadFileUpload && res.version != null) {
        setCurrentVersion(res.version)
      }

      if (hadFileUpload && res.ack_reset) {
        const ackRequired =
          res.acknowledgment_required !== false &&
          ackStatus?.acknowledgment_required !== false &&
          !ackStatus?.is_historic_mou

        if (ackRequired) {
          setWarning(
            res.message ||
              'A new MOU file was uploaded. Party A and Party B must open the acknowledgment section below and confirm they have reviewed the current document.',
          )
        } else {
          setSuccess(
            res.message ||
              'MOU file uploaded successfully. Party acknowledgment is not required for this historic MOU.',
          )
        }
        const nextStatus = res.mou_status || 'uploaded'
        onStatusChange?.(nextStatus)
        setMouData((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            mou_status: nextStatus,
            mou_uploaded_at: res.mou_uploaded_at ?? prev.mou_uploaded_at,
            mou: res.mou ? { ...prev.mou, ...res.mou } : prev.mou,
          }
        })
        setAckRefresh((n) => n + 1)
      } else if (hadFileUpload) {
        setSuccess(res.message || 'File uploaded')
        if (res.mou_status) onStatusChange?.(res.mou_status)
      } else {
        setSuccess(res.message || 'MOU saved successfully')
        if (res.mou_status) onStatusChange?.(res.mou_status)
      }

      setMouFile(null)
      setMarkSigned(false)
      await load()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteMouFile = async () => {
    if (!matchId && !proposalId) return
    setDeletingFile(true)
    setError('')
    setSuccess('')
    setWarning('')
    try {
      const res = isDirectProposal
        ? await proposalsApi.deleteProposalMou(proposalId)
        : await mmApi.deleteMatchMou(matchId)
      setSuccess(res?.message || 'MOU file deleted')
      setDeleteConfirmOpen(false)
      setMouFile(null)
      onStatusChange?.(res?.mou_status || 'not_started')
      await load()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setDeletingFile(false)
    }
  }

  const handleCloseDeal = async () => {
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const res = isDirectProposal
        ? await proposalsApi.closeProposalDeal(proposalId)
        : await mmApi.closeMatchDeal(matchId)
      setSuccess(res.message || 'Deal closed successfully')
      onStatusChange?.('deal_closed')
      onDealClosed?.(res)
      setAckRefresh((n) => n + 1)
      await load()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[24vh] items-center justify-center rounded-2xl border border-slate-200 bg-white">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!mouData) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center text-slate-500">
        MOU data unavailable for this match.
      </div>
    )
  }

  const mouStatus = mouData.mou_status || 'not_started'
  const isDealClosed = mouStatus === 'deal_closed'
  const fileUrl = mouData.mou?.mou_file_url
  const stepIndex = MM_MOU_STATUS_ORDER.indexOf(mouStatus)
  const currentStep = stepIndex >= 0 ? stepIndex : MM_MOU_STATUS_ORDER.length - 1
  const mouCaps = mouData.capabilities || {}
  const resolvedCanUploadMou =
    canUploadMou ??
    (typeof mouCaps.can_upload_mou === 'boolean' ? mouCaps.can_upload_mou : canEdit)
  const resolvedCanEditMouFields =
    canEditMouFields ??
    (typeof mouCaps.can_edit_mou_fields === 'boolean' ? mouCaps.can_edit_mou_fields : canEdit)
  const resolvedCanDeleteMou = mouCaps.can_delete_mou === true
  const showMouEditor =
    !isDealClosed && (resolvedCanUploadMou || resolvedCanEditMouFields)
  const canMarkSignedNow = canMarkSigned && resolvedCanEditMouFields

  const syncedSector = displayOrDash(
    proposal?.sector || form.mou_sector || mouData.mou?.mou_sector,
  )
  const syncedDemand = (() => {
    if (proposal?.investment_value_usd != null && proposal.investment_value_usd !== '') {
      return formatMouValueUsd(proposal.investment_value_usd)
    }
    return displayOrDash(form.mou_demand || mouData.mou?.mou_demand)
  })()
  const syncedOutcome = displayOrDash(
    proposal?.proposal_description || form.mou_description || mouData.mou?.mou_description,
  )

  return (
    <div className="space-y-6">
      <Alert type="error" message={error} onClose={() => setError('')} />
      <Alert type="warning" message={warning} onClose={() => setWarning('')} />
      <Alert type="success" message={success} onClose={() => setSuccess('')} />

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">MOU</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Status, document, and details in one place
            </p>
          </div>
          <MmMouStatusBadge status={mouStatus} />
        </div>

        {isDealClosed && (mouData.deal_closed_at || mouData.deal_closed_by_name) && (
          <div className="border-b border-slate-100 bg-slate-50 px-6 py-3 text-sm text-slate-700">
            <strong>Deal closed</strong>
            {mouData.deal_closed_by_name && <span> by {mouData.deal_closed_by_name}</span>}
            {mouData.deal_closed_at && (
              <span className="text-slate-500"> · {formatDate(mouData.deal_closed_at)}</span>
            )}
          </div>
        )}

        <div className="space-y-5 px-6 py-5">
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Workflow
            </p>
            <div className="flex flex-wrap items-center gap-2 sm:gap-0">
              {MM_MOU_STATUS_ORDER.map((step, idx) => {
                const done = idx <= currentStep
                const active = idx === currentStep
                return (
                  <div key={step} className="flex items-center">
                    <div
                      className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
                        active
                          ? 'bg-green-100 text-green-900 ring-2 ring-green-400'
                          : done
                            ? 'bg-green-50 text-green-800'
                            : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
                          done ? 'bg-green-600 text-white' : 'bg-slate-300 text-slate-600'
                        }`}
                      >
                        {done ? '✓' : idx + 1}
                      </span>
                      {MM_MOU_STATUS_LABELS[step]}
                    </div>
                    {idx < MM_MOU_STATUS_ORDER.length - 1 && (
                      <div
                        className={`mx-1 hidden h-0.5 w-6 sm:block md:w-10 ${
                          idx < currentStep ? 'bg-green-400' : 'bg-slate-200'
                        }`}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Document
            </p>
            <MouDocumentStatusCard
              fileUrl={fileUrl}
              version={currentVersion}
              uploadedAt={mouData.mou_uploaded_at}
              pendingFile={mouFile}
              canDelete={resolvedCanDeleteMou}
              onPreview={(url) =>
                setFilePreview({ url: resolveFileUrl(url), title: 'MOU Document' })
              }
              onDelete={() => setDeleteConfirmOpen(true)}
            />
          </div>

          <div className="space-y-4 border-t border-slate-100 pt-5">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">MOU fields</h3>
              <p className="mt-0.5 text-xs text-slate-500">
                Scope is unique to this tab. Sector, Demand, and Outcome come from Details — edit
                them with Edit MOU fields.
              </p>
            </div>

            <div className="grid gap-3 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-sm sm:grid-cols-2">
              <InfoRow label="Sector (from Details)" value={syncedSector} />
              <InfoRow label="Demand (from Details)" value={syncedDemand} />
              <div className="sm:col-span-2">
                <InfoRow label="Outcome / Description (from Details)" value={syncedOutcome} multiline />
              </div>
            </div>

            {showMouEditor ? (
              <>
                <MouField
                  label="Scope"
                  value={form.mou_scope}
                  onChange={(v) => setForm((f) => ({ ...f, mou_scope: v }))}
                  disabled={!resolvedCanEditMouFields || saving}
                />
                {resolvedCanUploadMou && (
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      {fileUrl ? 'Replace document' : 'Upload document'}
                    </label>
                    <p className="mb-2 text-xs text-slate-500">PDF, DOC, or DOCX</p>
                    <input
                      type="file"
                      name="mou_file"
                      accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      onChange={(e) => setMouFile(e.target.files?.[0] || null)}
                      disabled={saving}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium"
                    />
                    {mouFile && (
                      <p className="mt-1.5 text-xs font-medium text-green-800">
                        Selected: {mouFile.name} — click Save to upload
                      </p>
                    )}
                  </div>
                )}
                {canMarkSignedNow && mouStatus !== 'signed' && !isDealClosed && (
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={markSigned}
                      onChange={(e) => setMarkSigned(e.target.checked)}
                      disabled={!resolvedCanEditMouFields || saving}
                      className="rounded border-slate-300"
                    />
                    Mark MOU as signed (both parties)
                  </label>
                )}
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || (!resolvedCanEditMouFields && !mouFile)}
                  className="rounded-lg bg-portal-primary px-4 py-2 text-sm font-semibold text-white hover:bg-portal-primary-hover disabled:opacity-60"
                >
                  {saving ? 'Saving…' : resolvedCanEditMouFields ? 'Save scope & file' : 'Upload MOU file'}
                </button>
              </>
            ) : (
              <InfoRow label="Scope" value={form.mou_scope} />
            )}
          </div>
        </div>
      </section>

      {canCloseDeal && !isDealClosed && (
        <section className="rounded-2xl border border-green-200 bg-green-50/50 px-6 py-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-slate-800">Finalize Deal</h3>
              <p className="mt-1 text-sm text-slate-600">
                Both parties have acknowledged the MOU. Close the deal to mark it complete.
              </p>
            </div>
            <CloseDealButton onConfirm={handleCloseDeal} loading={saving} />
          </div>
        </section>
      )}

      <MouAcknowledgmentPanel
        proposalId={isDirectProposal ? proposalId : undefined}
        matchId={matchId}
        refreshTrigger={ackRefresh}
        onStatusChange={onStatusChange}
        onStatusLoaded={handleAckStatusLoaded}
      />

      <Modal
        open={deleteConfirmOpen}
        title="Delete MOU file?"
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDeleteMouFile}
        confirmLabel="Delete file"
        confirmVariant="danger"
        loading={deletingFile}
      >
        <p className="text-sm text-slate-600">
          This removes the current MOU document from this opportunity. Scope and other text fields
          stay. You can upload a new file afterward.
        </p>
      </Modal>

      <FilePreviewModal
        open={Boolean(filePreview)}
        fileUrl={filePreview?.url}
        title={filePreview?.title}
        onClose={() => setFilePreview(null)}
      />
    </div>
  )
}

function MouDocumentStatusCard({
  fileUrl,
  version,
  uploadedAt,
  pendingFile,
  canDelete = false,
  onPreview,
  onDelete,
}) {
  if (pendingFile) {
    return (
      <div className="rounded-xl border-2 border-dashed border-green-400 bg-green-50 px-4 py-3">
        <p className="text-sm font-semibold text-green-900">New file selected — save to upload</p>
        <p className="mt-1 truncate text-sm text-green-800">{pendingFile.name}</p>
      </div>
    )
  }

  if (fileUrl) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50/80 px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-semibold text-green-900">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-600 text-sm text-white">
                ✓
              </span>
              MOU document on file
            </p>
            {uploadedAt && (
              <p className="mt-1.5 text-xs text-slate-600">
                Uploaded {formatDate(uploadedAt)}
                {version != null && (
                  <>
                    {' '}
                    · <MouVersionBadge version={version} />
                  </>
                )}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onPreview?.(fileUrl)}
              className="rounded-lg border border-green-700/30 bg-white px-3 py-1.5 text-xs font-semibold text-green-900 hover:bg-green-50"
            >
              Preview
            </button>
            <a
              href={resolveFileUrl(fileUrl)}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Download
            </a>
            {canDelete && onDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
              >
                Delete
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3">
      <p className="text-sm font-medium text-slate-600">No MOU document uploaded yet</p>
      <p className="mt-1 text-xs text-slate-500">Choose a signed MOU file in Details below.</p>
    </div>
  )
}

function MouField({ label, value, onChange, disabled = false }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/30 disabled:bg-slate-50 disabled:text-slate-500"
      />
    </div>
  )
}

function InfoRow({ label, value, multiline }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-0.5 text-slate-800 ${multiline ? 'whitespace-pre-wrap' : ''}`}>
        {value || '—'}
      </p>
    </div>
  )
}
