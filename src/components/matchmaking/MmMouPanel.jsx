import { useCallback, useEffect, useState } from 'react'
import * as mmApi from '../../api/matchmaking'
import * as proposalsApi from '../../api/proposals'
import Alert from '../Alert'
import DocLink from '../DocLink'
import FilePreviewModal from '../FilePreviewModal'
import LoadingSpinner from '../LoadingSpinner'
import { MM_MOU_STATUS_LABELS, MM_MOU_STATUS_ORDER } from '../../constants/matchmaking'
import { useSectors } from '../../context/SectorsContext'
import { formatDate, getErrorMessage, resolveFileUrl } from '../../utils/format'
import MmMouStatusBadge from './MmMouStatusBadge'
import CloseDealButton from './CloseDealButton'
import MouAcknowledgmentPanel from './MouAcknowledgmentPanel'
import MouVersionHistory, { MouVersionBadge } from './MouVersionHistory'

const EMPTY_FORM = {
  mou_scope: '',
  mou_description: '',
  mou_sector: '',
  mou_demand: '',
}

export default function MmMouPanel({
  matchId,
  proposalId,
  canEdit = true,
  canMarkSigned = false,
  canCloseDeal = false,
  onStatusChange,
  onDealClosed,
}) {
  const { sectors } = useSectors()
  const defaultSector = sectors[0] || ''
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
  const [statusVersions, setStatusVersions] = useState([])
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false)

  const handleAckStatusLoaded = useCallback(
    (data) => {
      setAckStatus(data)
      onStatusChange?.(data?.mou_status)
      setCurrentVersion(
        data?.current_version ??
          data?.versions?.find((v) => v.is_current)?.version_number ??
          null,
      )
      setStatusVersions(Array.isArray(data?.versions) ? data.versions : [])
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
        mou_sector: mou.mou_sector || defaultSector,
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
  }, [matchId, proposalId, isDirectProposal, onStatusChange, defaultSector])

  useEffect(() => {
    load()
  }, [load])

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setSuccess('')
    setWarning('')
    const hadFileUpload = Boolean(mouFile)
    try {
      const fields = { ...form }
      if (markSigned) fields.mou_status = 'signed'
      const res = isDirectProposal
        ? await proposalsApi.saveProposalMou(proposalId, fields, mouFile)
        : await mmApi.saveMatchMou(matchId, fields, mouFile)

      if (hadFileUpload && res.version != null) {
        setCurrentVersion(res.version)
      }

      if (hadFileUpload && res.ack_reset) {
        setWarning(
          res.message || 'New file uploaded — both parties must re-acknowledge',
        )
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
  const versionEntityType = isDirectProposal ? 'proposal' : 'match'
  const versionEntityId = isDirectProposal ? proposalId : matchId

  return (
    <div className="space-y-6">
      <Alert type="error" message={error} onClose={() => setError('')} />
      <Alert type="warning" message={warning} onClose={() => setWarning('')} />
      <Alert type="success" message={success} onClose={() => setSuccess('')} />

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">MOU Tracking</h2>
            <p className="text-sm text-slate-500">
              {isDirectProposal
                ? `Direct Opportunity #${mouData.proposal_id}`
                : `Match #${mouData.match_id}${
                    mouData.engagement_proposal_id
                      ? ` · Engagement #${mouData.engagement_proposal_id}`
                      : ''
                  }`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <MmMouStatusBadge status={mouStatus} />
            {ackStatus?.is_historic_mou && (
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900 ring-1 ring-amber-200">
                Historic MOU — acknowledgment not required
              </span>
            )}
          </div>
        </div>

        {isDealClosed && (mouData.deal_closed_at || mouData.deal_closed_by_name) && (
          <div className="border-b border-slate-100 bg-slate-50 px-6 py-3 text-sm text-slate-700">
            <strong>Deal closed</strong>
            {mouData.deal_closed_by_name && (
              <span>
                {' '}
                by {mouData.deal_closed_by_name}
              </span>
            )}
            {mouData.deal_closed_at && (
              <span className="text-slate-500"> · {formatDate(mouData.deal_closed_at)}</span>
            )}
          </div>
        )}

        <div className="px-6 py-5">
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
          {mouData.mou_uploaded_at && (
            <p className="mt-3 text-xs text-slate-500">
              Last uploaded {formatDate(mouData.mou_uploaded_at)}
              {currentVersion != null && (
                <span className="ml-2">
                  · Current file <MouVersionBadge version={currentVersion} />
                </span>
              )}
            </p>
          )}
          {fileUrl && (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <MouFileLink
                fileUrl={fileUrl}
                version={currentVersion}
                onPreview={(url) =>
                  setFilePreview({ url: resolveFileUrl(url), title: 'MOU Document' })
                }
              />
              <button
                type="button"
                onClick={() => setVersionHistoryOpen(true)}
                className="text-xs font-semibold text-portal-primary hover:underline"
              >
                Version history
              </button>
            </div>
          )}
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

      {canEdit && !isDealClosed ? (
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-4">
            <h3 className="text-base font-semibold text-slate-800">MOU Details</h3>
            <p className="mt-1 text-sm text-slate-500">
              Save text fields first, then upload the signed MOU document (PDF/DOC).
            </p>
          </div>
          <div className="space-y-4 px-6 py-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <MouField
                label="Scope"
                value={form.mou_scope}
                onChange={(v) => setForm((f) => ({ ...f, mou_scope: v }))}
              />
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Sector</label>
                <select
                  value={form.mou_sector}
                  onChange={(e) => setForm((f) => ({ ...f, mou_sector: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/30"
                >
                  {sectors.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <MouTextarea
              label="Description"
              value={form.mou_description}
              onChange={(v) => setForm((f) => ({ ...f, mou_description: v }))}
            />
            <MouTextarea
              label="Demand"
              value={form.mou_demand}
              onChange={(v) => setForm((f) => ({ ...f, mou_demand: v }))}
            />
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                MOU File (PDF/DOC/DOCX)
              </label>
              <input
                type="file"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(e) => setMouFile(e.target.files?.[0] || null)}
                disabled={saving}
                className="w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium"
              />
              {mouFile && (
                <p className="mt-1 text-xs text-green-700">Selected: {mouFile.name}</p>
              )}
              {fileUrl && !mouFile && (
                <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span>Current file on record — upload a new file to replace.</span>
                  <MouVersionBadge version={currentVersion} />
                </p>
              )}
            </div>
            {canMarkSigned && mouStatus !== 'signed' && !isDealClosed && (
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={markSigned}
                  onChange={(e) => setMarkSigned(e.target.checked)}
                  className="rounded border-slate-300"
                />
                Mark MOU as signed (both parties)
              </label>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-portal-primary text-white hover:bg-portal-primary-hover disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save MOU'}
            </button>
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-4">
            <h3 className="text-base font-semibold text-slate-800">MOU Details</h3>
          </div>
          <div className="space-y-3 px-6 py-5 text-sm">
            <InfoRow label="Scope" value={form.mou_scope} />
            <InfoRow label="Sector" value={form.mou_sector} />
            <InfoRow label="Description" value={form.mou_description} multiline />
            <InfoRow label="Demand" value={form.mou_demand} multiline />
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-slate-600">MOU Document</span>
              <MouVersionBadge version={currentVersion} />
              <DocLink
                url={fileUrl}
                title="MOU Document"
                onOpen={(url) =>
                  setFilePreview({ url: resolveFileUrl(url), title: 'MOU Document' })
                }
              />
              {fileUrl && (
                <button
                  type="button"
                  onClick={() => setVersionHistoryOpen(true)}
                  className="text-xs font-semibold text-portal-primary hover:underline"
                >
                  Version history
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      {fileUrl && canEdit && !isDealClosed && (
        <MouFileLink
          fileUrl={fileUrl}
          version={currentVersion}
          onPreview={(url) =>
            setFilePreview({ url: resolveFileUrl(url), title: 'MOU Document' })
          }
        />
      )}

      <MouVersionHistory
        entityType={versionEntityType}
        entityId={versionEntityId}
        open={versionHistoryOpen}
        onClose={() => setVersionHistoryOpen(false)}
        currentVersion={currentVersion}
        versions={statusVersions.length ? statusVersions : null}
      />

      <FilePreviewModal
        open={Boolean(filePreview)}
        url={filePreview?.url}
        title={filePreview?.title}
        onClose={() => setFilePreview(null)}
      />
    </div>
  )
}

function MouFileLink({ fileUrl, version, onPreview }) {
  if (!fileUrl) return null
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
      <span>Current MOU file:</span>
      <MouVersionBadge version={version} />
      <DocLink url={fileUrl} title="MOU Document" onOpen={onPreview} />
      <a
        href={resolveFileUrl(fileUrl)}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs font-medium text-portal-primary hover:underline"
      >
        Download
      </a>
    </div>
  )
}

function MouField({ label, value, onChange }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/30"
      />
    </div>
  )
}

function MouTextarea({ label, value, onChange }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      <textarea
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/30"
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
