import DocLink from '../DocLink'
import PokeStatusBadge from '../PokeStatusBadge'
import { formatDate, formatDateTime, resolveFileUrl } from '../../utils/format'
import { formatUpdateRequestLabel } from '../../utils/proposalDisplay'

function InfoRow({ label, value, multiline = false }) {
  if (!value) return null
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-sm text-slate-800 ${multiline ? 'whitespace-pre-wrap' : ''}`}>
        {value}
      </p>
    </div>
  )
}

export default function ProposalUpdateRequestsPanel({
  proposal,
  actionLoading = false,
  showStaffRequestHint = false,
  /** SA / PA / SL / Admin — same update-request actions when capability unset */
  staffCanManageUpdates = false,
  /** Super Admin + Power Admin — same Request for Update button (ignore false capability) */
  mouAdminCanRequest = false,
  onRequestUpdate,
  onRespond,
  onEditResponse,
  onPromote,
  onDismiss,
  onOpenFile,
}) {
  const caps = proposal?.capabilities || {}
  const poke = proposal?.poke_status || {}
  const status = poke.status || caps.update_request_status || 'none'
  const response = poke.party_a_response
  const pokeActivityId = poke.poke_activity_id

  const partyAEmailOk = caps.party_a_has_email !== false
  const canRequest =
    status === 'none' &&
    partyAEmailOk &&
    (caps.can_request_update === true ||
      mouAdminCanRequest ||
      (staffCanManageUpdates && caps.can_request_update !== false))
  const requestHint =
    caps.request_update_hint ||
    (caps.party_a_has_email === false
      ? 'Put email for Party A in Companies tab before requesting an update'
      : '')
  const showEmailHint = showStaffRequestHint && status === 'none' && !canRequest && Boolean(requestHint)
  const canRespond = caps.can_respond_to_update_request === true
  const canEdit = caps.can_edit_update_response === true
  const canPromote =
    status === 'awaiting_review' &&
    (caps.can_promote_update_to_progress === true ||
      mouAdminCanRequest ||
      (staffCanManageUpdates && caps.can_promote_update_to_progress !== false))
  const canDismiss =
    (status === 'pending_response' || status === 'awaiting_review') &&
    (caps.can_dismiss_update_request === true ||
      mouAdminCanRequest ||
      (staffCanManageUpdates && caps.can_dismiss_update_request !== false))

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-6 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Request for Update</h2>
            <p className="mt-1 text-sm text-slate-500">
              Sector Lead requests progress from Party A — review before adding to Progress tab.
            </p>
          </div>
          <PokeStatusBadge pokeStatus={poke} />
        </div>
      </div>

      <div className="space-y-4 px-6 py-5">
        {status === 'none' && (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-8 text-center">
            <p className="font-medium text-slate-700">No active update request</p>
            <p className="mt-1 text-sm text-slate-500">
              When Sector Lead requests an update, Party A submits work details here for review.
            </p>
            {canRequest && (
              <button
                type="button"
                onClick={onRequestUpdate}
                disabled={actionLoading}
                className="mt-4 inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-900 shadow-sm hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Request for Update
              </button>
            )}
            {showEmailHint && (
              <div className="mx-auto mt-4 max-w-md rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm text-amber-900">
                {requestHint}
              </div>
            )}
          </div>
        )}

        {status === 'pending_response' && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4">
            <p className="font-semibold text-amber-900">
              {formatUpdateRequestLabel(poke.short_label || poke.label) ||
                'Waiting for Party A response'}
            </p>
            <p className="mt-1 text-sm text-amber-800">
              Party A must submit work date, title, what was done, and optional proof document.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {canRespond && (
                <button
                  type="button"
                  onClick={onRespond}
                  disabled={actionLoading}
                  className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
                >
                  Submit update
                </button>
              )}
              {canDismiss && pokeActivityId && (
                <button
                  type="button"
                  onClick={() => onDismiss?.(pokeActivityId)}
                  disabled={actionLoading}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  Dismiss request
                </button>
              )}
            </div>
          </div>
        )}

        {status === 'awaiting_review' && response && (
          <div className="space-y-4">
            <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
              <p className="font-semibold text-blue-900">
                {formatUpdateRequestLabel(poke.short_label || poke.label) ||
                  'Party A update ready for review'}
              </p>
              <p className="mt-1 text-sm text-blue-800">
                Review the submission below. Edit if needed, then move to Progress.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-800">Party A submission</p>
                {(response.submitted_by_name || response.submitted_at) && (
                  <p className="text-xs text-slate-500">
                    {response.submitted_by_name}
                    {response.submitted_at && <> · {formatDateTime(response.submitted_at)}</>}
                  </p>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <InfoRow
                  label="Work date"
                  value={formatDate(response.work_date || response.activity_date)}
                />
                <InfoRow label="Title" value={response.title} />
                <div className="sm:col-span-2">
                  <InfoRow label="What was done?" value={response.description} multiline />
                </div>
                {response.support_file_url && (
                  <div className="sm:col-span-2">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      Proof document
                    </p>
                    <div className="mt-1">
                      <DocLink
                        url={response.support_file_url}
                        title="View proof"
                        onOpen={(url) =>
                          onOpenFile?.(
                            resolveFileUrl(url),
                            `Proof — ${response.title || 'Update'}`,
                          )
                        }
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {canEdit && (
                <button
                  type="button"
                  onClick={onEditResponse}
                  disabled={actionLoading}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  Edit update
                </button>
              )}
              {canPromote && pokeActivityId && (
                <button
                  type="button"
                  onClick={() => onPromote?.(pokeActivityId)}
                  disabled={actionLoading}
                  className="rounded-lg bg-portal-primary px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-green-400 disabled:opacity-60"
                >
                  Add to Progress
                </button>
              )}
              {canDismiss && pokeActivityId && (
                <button
                  type="button"
                  onClick={() => onDismiss?.(pokeActivityId)}
                  disabled={actionLoading}
                  className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
                >
                  Dismiss request
                </button>
              )}
            </div>
          </div>
        )}

        {status === 'awaiting_review' && !response && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-4 text-sm text-blue-900">
            Party A submitted an update — refresh the page if details do not appear.
          </div>
        )}

        {status === 'pending_response' && canRequest === false && !canRespond && !canDismiss && (
          <p className="text-sm text-slate-500">
            This request is pending. Party A will be notified to submit their update.
          </p>
        )}
      </div>
    </section>
  )
}
