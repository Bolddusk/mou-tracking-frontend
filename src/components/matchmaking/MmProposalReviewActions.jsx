import Modal from '../Modal'

export function MmProposalReviewActionButtons({
  proposal,
  viewLabel = 'View',
  onView,
  onShortlist,
  onReject,
  onForward,
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={onView}
        className="text-xs font-semibold text-slate-600 hover:underline"
      >
        {viewLabel}
      </button>
      {proposal.status === 'submitted' && (
        <>
          <button
            type="button"
            onClick={() => onShortlist(proposal)}
            className="text-xs font-semibold text-green-700 hover:underline"
          >
            Shortlist
          </button>
          <button
            type="button"
            onClick={() => onReject(proposal)}
            className="text-xs font-semibold text-red-700 hover:underline"
          >
            Reject
          </button>
        </>
      )}
      {proposal.status === 'shortlisted' && (
        <button
          type="button"
          onClick={() => onForward(proposal)}
          className="text-xs font-semibold text-blue-700 hover:underline"
        >
          Forward
        </button>
      )}
    </div>
  )
}

export function MmProposalReviewModal({
  actionTarget,
  actionType,
  comment,
  onCommentChange,
  forwardTargets,
  forwardToUserId,
  onForwardToChange,
  loadingForwardTargets,
  actionLoading,
  onClose,
  onConfirm,
}) {
  return (
    <Modal
      open={Boolean(actionTarget)}
      title={
        actionType === 'shortlist'
          ? 'Shortlist proposal'
          : actionType === 'forward'
            ? 'Forward proposal'
            : 'Reject proposal'
      }
      onClose={onClose}
      onConfirm={onConfirm}
      confirmLabel={actionType === 'reject' ? 'Reject' : actionType === 'forward' ? 'Forward' : 'Shortlist'}
      confirmVariant={actionType === 'reject' ? 'danger' : 'primary'}
      loading={actionLoading}
      confirmDisabled={
        (actionType === 'reject' && !comment.trim()) ||
        (actionType === 'forward' && !forwardToUserId)
      }
    >
      <p className="mb-3 text-sm text-slate-600">
        <strong>{actionTarget?.title}</strong>
      </p>
      {actionType === 'forward' && (
        <div className="mb-3">
          <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">
            Forward to
          </label>
          {loadingForwardTargets ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : (
            <select
              value={forwardToUserId}
              onChange={(e) => onForwardToChange(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">Select sector lead</option>
              {forwardTargets.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name} ({u.role_label || u.role})
                  {u.sector ? ` — ${u.sector}` : ''}
                </option>
              ))}
            </select>
          )}
        </div>
      )}
      <textarea
        rows={3}
        value={comment}
        onChange={(e) => onCommentChange(e.target.value)}
        placeholder={actionType === 'reject' ? 'Reason (required)' : 'Optional comment'}
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
      />
    </Modal>
  )
}
