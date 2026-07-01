import { useCallback, useEffect, useState } from 'react'
import * as mmApi from '../../api/matchmaking'
import * as proposalsApi from '../../api/proposals'
import Alert from '../Alert'
import { useAuth } from '../../context/AuthContext'
import { getErrorMessage } from '../../utils/format'
import MmMouStatusBadge from './MmMouStatusBadge'
import { MouVersionsTable } from './MouVersionHistory'

function formatAckTime(value) {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString('en-PK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function PartyAckRow({ label, subtitle, acknowledged, ackAt, canAck, acknowledging, onAck }) {
  return (
    <div className="flex flex-col gap-3 border-b border-slate-100 px-6 py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium text-slate-800">{label}</p>
          {subtitle && <span className="text-xs text-slate-500">{subtitle}</span>}
          {acknowledged ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">
              ✓ Acknowledged
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
              ○ Pending
            </span>
          )}
        </div>
        {acknowledged && ackAt && (
          <p className="mt-1 text-xs text-slate-500">Acknowledged: {formatAckTime(ackAt)}</p>
        )}
      </div>
      {canAck && (
        <button
          type="button"
          onClick={onAck}
          disabled={acknowledging}
          className="inline-flex shrink-0 items-center justify-center rounded-lg bg-portal-primary px-4 py-2 text-sm font-semibold text-white hover:bg-portal-primary-hover disabled:opacity-50"
        >
          {acknowledging ? 'Acknowledging…' : 'I Acknowledge MOU'}
        </button>
      )}
    </div>
  )
}

export default function MouAcknowledgmentPanel({
  proposalId,
  matchId,
  refreshTrigger = 0,
  onStatusChange,
  onStatusLoaded,
}) {
  const { isPartyA, isPartyB, isInvestor } = useAuth()
  const isDirect = Boolean(proposalId && !matchId)

  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [acknowledging, setAcknowledging] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const load = useCallback(async () => {
    if (!proposalId && !matchId) return
    setLoading(true)
    setError('')
    try {
      const data = isDirect
        ? await proposalsApi.getProposalMouAckStatus(proposalId)
        : await mmApi.getMatchMouAckStatus(matchId)
      setStatus(data)
      onStatusChange?.(data.mou_status)
      onStatusLoaded?.(data)
    } catch (err) {
      setError(getErrorMessage(err))
      setStatus(null)
    } finally {
      setLoading(false)
    }
  }, [proposalId, matchId, isDirect, onStatusChange, onStatusLoaded])

  useEffect(() => {
    load()
  }, [load, refreshTrigger])

  const handleAck = async () => {
    if (!status?.can_acknowledge) return
    setAcknowledging(true)
    setError('')
    setSuccess('')
    try {
      const data = isDirect
        ? await proposalsApi.acknowledgeProposalMou(proposalId)
        : await mmApi.acknowledgeMatchMou(matchId)
      setSuccess(
        data.mou_status === 'signed'
          ? 'MOU fully signed — both parties have acknowledged.'
          : data.message || 'MOU acknowledged successfully',
      )
      await load()
    } catch (err) {
      const msg = getErrorMessage(err)
      if (msg.toLowerCase().includes('already acknowledged')) {
        await load()
      } else {
        setError(msg)
      }
    } finally {
      setAcknowledging(false)
    }
  }

  if (loading) {
    return null
  }

  if (!status) {
    return error ? (
      <section className="rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
        <Alert type="error" message={error} onClose={() => setError('')} />
      </section>
    ) : null
  }

  if (status.acknowledgment_required === false) {
    return null
  }

  const versions = Array.isArray(status.versions) ? status.versions : []
  const hasCurrentFile =
    versions.some((v) => v.is_current) ||
    Boolean(status.mou_file_url) ||
    versions.length > 0
  const partyAAck = Boolean(status.party_a_acknowledged)
  const partyBAck = Boolean(status.party_b_acknowledged)
  const ackCount = (partyAAck ? 1 : 0) + (partyBAck ? 1 : 0)
  const progressPct = (ackCount / 2) * 100
  const mouStatus = status.mou_status || 'not_started'
  const isDealClosed = mouStatus === 'deal_closed'
  const isFullySigned = mouStatus === 'signed' || isDealClosed

  const canAckPartyA =
    status.can_acknowledge === true &&
    !isDealClosed &&
    isPartyA &&
    !partyAAck &&
    hasCurrentFile
  const canAckPartyB =
    status.can_acknowledge === true &&
    !isDealClosed &&
    (isPartyB || isInvestor) &&
    !partyBAck &&
    hasCurrentFile

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
        <div>
          <h3 className="text-base font-semibold text-slate-800">Party Acknowledgments</h3>
          <p className="mt-0.5 text-sm text-slate-500">
            Each party acknowledges the <strong>current</strong> MOU file. Older versions remain as
            history.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <MmMouStatusBadge status={mouStatus} />
          {isDealClosed && (
            <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-bold text-slate-800 ring-1 ring-slate-300">
              Deal Closed
            </span>
          )}
          {isFullySigned && !isDealClosed && (
            <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-bold text-green-800 ring-1 ring-green-200">
              Fully Signed ✓
            </span>
          )}
        </div>
      </div>

      <Alert type="error" message={error} onClose={() => setError('')} />
      <Alert type="success" message={success} onClose={() => setSuccess('')} />

      {isDealClosed && (status.deal_closed_at || status.deal_closed_by_name) && (
        <div className="border-b border-slate-100 bg-slate-50 px-6 py-3 text-sm text-slate-700">
          Closed
          {status.deal_closed_by_name && ` by ${status.deal_closed_by_name}`}
          {status.deal_closed_at && (
            <span className="text-slate-500"> · {formatAckTime(status.deal_closed_at)}</span>
          )}
        </div>
      )}

      {versions.length > 0 ? (
        <div className="border-b border-slate-100 px-6 py-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-sm font-semibold text-slate-800">MOU Files</h4>
            {status.total_versions > 1 && (
              <p className="text-xs text-slate-500">
                Acknowledgment applies to <strong>Current</strong> version only
              </p>
            )}
          </div>
          <MouVersionsTable versions={versions} currentVersion={status.current_version} />
        </div>
      ) : (
        !isDealClosed && (
        <div className="border-b border-amber-100 bg-amber-50 px-6 py-3 text-sm text-amber-900">
          Upload MOU first — acknowledgment is available after a document is on file.
        </div>
        )
      )}

      <PartyAckRow
        label="Party A (Pakistan)"
        acknowledged={partyAAck}
        ackAt={status.party_a_ack_at}
        canAck={canAckPartyA}
        acknowledging={acknowledging}
        onAck={handleAck}
      />
      <PartyAckRow
        label="Party B (China)"
        acknowledged={partyBAck}
        ackAt={status.party_b_ack_at}
        canAck={canAckPartyB}
        acknowledging={acknowledging}
        onAck={handleAck}
      />

      <div className="border-t border-slate-100 px-6 py-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-slate-700">
            Progress: {ackCount}/2 parties acknowledged
          </span>
          <span className="text-slate-500 capitalize">{mouStatus.replace(/_/g, ' ')}</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              ackCount === 2 ? 'bg-green-600' : 'bg-portal-primary'
            }`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>
    </section>
  )
}
