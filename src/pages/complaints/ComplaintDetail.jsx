import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import * as complaintsApi from '../../api/complaints'
import Alert from '../../components/Alert'
import ComplaintStatusBadge from '../../components/ComplaintStatusBadge'
import DocLink from '../../components/DocLink'
import FilePreviewModal from '../../components/FilePreviewModal'
import LoadingSpinner from '../../components/LoadingSpinner'
import Modal from '../../components/Modal'
import { useAuth } from '../../context/AuthContext'
import { ROLE_LABELS } from '../../constants/sectors'
import {
  formatComplaintCategory,
  formatComplaintPriority,
  getComplaintMouTitle,
  priorityBadgeClass,
} from '../../utils/complaintDisplay'
import { getComplaintActionFlags } from '../../utils/complaintPermissions'
import { formatDate, getErrorMessage, resolveFileUrl } from '../../utils/format'

const ACTION_LABELS = {
  approved: 'Resolved',
  rejected: 'Rejected',
  escalated: 'Escalated',
  reopened: 'Reopened',
  under_review: 'Under review',
  forwarded: 'Forwarded',
  returned: 'Returned',
}

export default function ComplaintDetail() {
  const { id } = useParams()
  const { user, isPartyA, isPartyB, isSectorLead, isSuperAdmin, isRegionalFocalPoint, dashboardPath } =
    useAuth()

  const [complaint, setComplaint] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [commentDraft, setCommentDraft] = useState('')
  const [filePreview, setFilePreview] = useState(null)

  const [approveOpen, setApproveOpen] = useState(false)
  const [approveComment, setApproveComment] = useState('')
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectComment, setRejectComment] = useState('')
  const [escalateOpen, setEscalateOpen] = useState(false)
  const [escalateComment, setEscalateComment] = useState('')
  const [reopenOpen, setReopenOpen] = useState(false)
  const [reopenComment, setReopenComment] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await complaintsApi.getComplaintById(id)
      setComplaint(data)
    } catch (err) {
      setError(getErrorMessage(err))
      setComplaint(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const actionFlags = getComplaintActionFlags(complaint, {
    userId: user?.id,
    isSectorLead,
    isSuperAdmin,
    isRegionalFocalPoint,
  })

  const canApprove = complaint?.capabilities
    ? complaint.capabilities.can_approve === true
    : actionFlags.canApprove
  const canReject = complaint?.capabilities
    ? complaint.capabilities.can_reject === true
    : actionFlags.canReject
  const canComment = complaint?.capabilities
    ? complaint.capabilities.can_comment === true
    : actionFlags.canComment === true
  const canEscalate = complaint?.capabilities
    ? complaint.capabilities.can_escalate === true
    : actionFlags.canEscalate === true
  const canReopen = complaint?.capabilities
    ? complaint.capabilities.can_reopen === true
    : actionFlags.canReopen === true

  const timeline = useMemo(() => {
    if (!complaint) return []
    const actionItems = (complaint.actions || []).map((a) => ({
      id: `action-${a.id}`,
      kind: 'action',
      label: ACTION_LABELS[a.action] || a.action,
      name: a.action_by_name,
      role: a.action_by_role,
      at: a.actioned_at,
      comment: a.comment,
      document_url: a.document_url,
    }))
    const commentItems = (complaint.comments || []).map((c) => ({
      id: `comment-${c.id}`,
      kind: 'comment',
      label: 'Comment',
      name: c.commented_by_name,
      role: c.commented_by_role,
      at: c.created_at,
      comment: c.comment,
      document_url: c.document_url,
    }))
    return [...actionItems, ...commentItems].sort(
      (a, b) => new Date(a.at || 0).getTime() - new Date(b.at || 0).getTime(),
    )
  }, [complaint])

  const complaintsListPath =
    isSectorLead || isSuperAdmin
      ? `${dashboardPath}?view=complaints`
      : isRegionalFocalPoint
        ? '/complaints'
        : dashboardPath

  const handleApprove = async () => {
    if (!approveComment.trim()) return
    setActionLoading(true)
    setError('')
    try {
      await complaintsApi.approveComplaint(id, approveComment.trim())
      setApproveOpen(false)
      setApproveComment('')
      setSuccess('Complaint resolved')
      await load()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    if (!rejectComment.trim()) return
    setActionLoading(true)
    setError('')
    try {
      await complaintsApi.rejectComplaint(id, rejectComment.trim())
      setRejectOpen(false)
      setRejectComment('')
      setSuccess('Complaint rejected')
      await load()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setActionLoading(false)
    }
  }

  const handleEscalate = async () => {
    setActionLoading(true)
    setError('')
    try {
      await complaintsApi.escalateComplaint(id, escalateComment.trim() || undefined)
      setEscalateOpen(false)
      setEscalateComment('')
      setSuccess('Complaint escalated to Super Admin')
      await load()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setActionLoading(false)
    }
  }

  const handleReopen = async () => {
    if (!reopenComment.trim()) return
    setActionLoading(true)
    setError('')
    try {
      await complaintsApi.reopenComplaint(id, reopenComment.trim())
      setReopenOpen(false)
      setReopenComment('')
      setSuccess('Complaint reopened')
      await load()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setActionLoading(false)
    }
  }

  const handleAddComment = async () => {
    if (!commentDraft.trim()) return
    setActionLoading(true)
    setError('')
    try {
      await complaintsApi.addComplaintComment(id, {
        comment: commentDraft.trim(),
        visibility: 'public',
      })
      setCommentDraft('')
      setSuccess('Comment added')
      await load()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!complaint) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <p className="text-slate-600">Complaint not found</p>
        <Link
          to={complaintsListPath}
          className="mt-4 inline-flex text-sm font-medium text-green-600 hover:underline"
        >
          ← Back to complaints
        </Link>
      </div>
    )
  }

  const outcome = complaint.outcome
  const showActions = canApprove || canReject || canEscalate || canReopen

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to={complaintsListPath}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50"
        >
          ← {isPartyA || isPartyB || isSectorLead || isSuperAdmin ? 'Dashboard' : 'Complaints'}
        </Link>
        <Link
          to={complaintsListPath}
          className="text-sm font-medium text-green-600 hover:underline"
        >
          All complaints
        </Link>
      </div>

      <Alert type="error" message={error} onClose={() => setError('')} />
      <Alert type="success" message={success} onClose={() => setSuccess('')} />

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50/80 px-6 py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                Complaint #{complaint.id}
              </p>
              <h1 className="mt-1 text-xl font-bold text-slate-800">{complaint.title}</h1>
              <p className="mt-1 text-sm text-slate-500">
                Filed {formatDate(complaint.created_at)} by {complaint.filed_by_name}
                <FiledByRoleBadge role={complaint.filed_by_role} />
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <ComplaintStatusBadge status={complaint.status} />
              {complaint.is_overdue && (
                <span className="inline-flex rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-800 ring-1 ring-red-200">
                  Overdue
                </span>
              )}
              {Number(complaint.awaiting_sector_lead) === 1 && (
                <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-900 ring-1 ring-amber-200">
                  Awaiting sector lead
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-4 p-6 sm:grid-cols-2">
          <InfoItem label="Proposal" value={getComplaintMouTitle(complaint)} />
          <InfoItem label="Sector" value={complaint.proposal_sector} />
          <InfoItem label="Company" value={complaint.proposal_company_name} />
          <InfoItem label="Tagged Sector Lead" value={complaint.tagged_sector_lead_name} />
          <InfoItem label="Priority" value="">
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${priorityBadgeClass(complaint.priority)}`}
            >
              {formatComplaintPriority(complaint.priority || 'normal')}
            </span>
          </InfoItem>
          <InfoItem label="Category" value={formatComplaintCategory(complaint.category)} />
          <InfoItem
            label="Due"
            value={
              complaint.due_at
                ? `${formatDate(complaint.due_at)}${complaint.sla_days ? ` (SLA ${complaint.sla_days}d)` : ''}`
                : '—'
            }
          />
          <InfoItem label="Document" value="">
            {complaint.document_url ? (
              <DocLink
                url={complaint.document_url}
                title="View complaint document"
                onOpen={(url) =>
                  setFilePreview({
                    url: resolveFileUrl(url),
                    title: `Complaint #${complaint.id} document`,
                  })
                }
              />
            ) : (
              <span className="text-slate-400">—</span>
            )}
          </InfoItem>
        </div>

        <div className="border-t border-slate-100 px-6 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Description
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">{complaint.description}</p>
        </div>

        {outcome?.comment && (
          <div className="border-t border-slate-100 bg-slate-50/60 px-6 py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Outcome
              {outcome.status ? ` · ${ACTION_LABELS[outcome.status] || outcome.status}` : ''}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">{outcome.comment}</p>
          </div>
        )}

        {showActions && (
          <div className="flex flex-wrap gap-2 border-t border-slate-100 bg-slate-50/50 px-6 py-4">
            {canApprove && (
              <button
                type="button"
                onClick={() => setApproveOpen(true)}
                disabled={actionLoading}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
              >
                Resolve
              </button>
            )}
            {canReject && (
              <button
                type="button"
                onClick={() => setRejectOpen(true)}
                disabled={actionLoading}
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-800 hover:bg-red-100 disabled:opacity-50"
              >
                Reject
              </button>
            )}
            {canEscalate && (
              <button
                type="button"
                onClick={() => setEscalateOpen(true)}
                disabled={actionLoading}
                className="rounded-lg border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-900 hover:bg-violet-100 disabled:opacity-50"
              >
                Escalate
              </button>
            )}
            {canReopen && (
              <button
                type="button"
                onClick={() => setReopenOpen(true)}
                disabled={actionLoading}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
              >
                Reopen
              </button>
            )}
          </div>
        )}
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-800">Timeline</h2>
          <p className="text-xs text-slate-500">Actions and public comments</p>
        </div>
        <div className="px-6 py-4">
          {timeline.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-500">No timeline entries yet.</p>
          ) : (
            <div className="relative space-y-0">
              <div className="absolute bottom-2 left-[11px] top-2 w-0.5 bg-slate-200" />
              {timeline.map((item, i) => (
                <TimelineEntry
                  key={item.id}
                  item={item}
                  isLast={i === timeline.length - 1}
                  onOpenFile={(url, title) =>
                    setFilePreview({ url: resolveFileUrl(url), title })
                  }
                />
              ))}
            </div>
          )}

          {canComment && (
            <div className="mt-4 flex gap-2 border-t border-slate-100 pt-4">
              <input
                type="text"
                value={commentDraft}
                onChange={(e) => setCommentDraft(e.target.value)}
                placeholder="Add a comment…"
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100"
              />
              <button
                type="button"
                disabled={actionLoading || !commentDraft.trim()}
                onClick={handleAddComment}
                className="rounded-lg bg-sidebar px-4 py-2 text-sm font-semibold text-white hover:bg-sidebar-hover disabled:opacity-50"
              >
                Add comment
              </button>
            </div>
          )}
        </div>
      </section>

      <Modal
        open={approveOpen}
        title="Resolve Complaint"
        onClose={() => setApproveOpen(false)}
        onConfirm={handleApprove}
        confirmLabel="Resolve"
        loading={actionLoading}
        confirmDisabled={!approveComment.trim()}
      >
        <p className="mb-3 text-sm text-slate-600">
          Resolution comment is required before closing this complaint.
        </p>
        <textarea
          rows={3}
          value={approveComment}
          onChange={(e) => setApproveComment(e.target.value)}
          placeholder="Resolution note (required)"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
      </Modal>

      <Modal
        open={rejectOpen}
        title="Reject Complaint"
        onClose={() => setRejectOpen(false)}
        onConfirm={handleReject}
        confirmLabel="Reject"
        confirmVariant="danger"
        loading={actionLoading}
        confirmDisabled={!rejectComment.trim()}
      >
        <textarea
          rows={3}
          value={rejectComment}
          onChange={(e) => setRejectComment(e.target.value)}
          placeholder="Rejection reason (required)"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
      </Modal>

      <Modal
        open={escalateOpen}
        title="Escalate Complaint"
        onClose={() => setEscalateOpen(false)}
        onConfirm={handleEscalate}
        confirmLabel="Escalate"
        loading={actionLoading}
      >
        <p className="mb-3 text-sm text-slate-600">
          Escalate to Super Admin. Optional note is saved on the timeline.
        </p>
        <textarea
          rows={3}
          value={escalateComment}
          onChange={(e) => setEscalateComment(e.target.value)}
          placeholder="Optional escalation note"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
      </Modal>

      <Modal
        open={reopenOpen}
        title="Reopen Complaint"
        onClose={() => setReopenOpen(false)}
        onConfirm={handleReopen}
        confirmLabel="Reopen"
        loading={actionLoading}
        confirmDisabled={!reopenComment.trim()}
      >
        <p className="mb-3 text-sm text-slate-600">
          Reopen a rejected complaint. Comment is required.
        </p>
        <textarea
          rows={3}
          value={reopenComment}
          onChange={(e) => setReopenComment(e.target.value)}
          placeholder="Reason to reopen (required)"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
      </Modal>

      <FilePreviewModal
        open={Boolean(filePreview)}
        title={filePreview?.title}
        fileUrl={filePreview?.url}
        onClose={() => setFilePreview(null)}
      />
    </div>
  )
}

function InfoItem({ label, value, children }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <div className="mt-1 text-sm font-medium text-slate-800">{children || value || '—'}</div>
    </div>
  )
}

function FiledByRoleBadge({ role }) {
  const normalized = String(role || '').toLowerCase()
  if (normalized !== 'party_a' && normalized !== 'party_b') return null
  const isA = normalized === 'party_a'
  return (
    <span
      className={`ml-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${
        isA
          ? 'bg-emerald-50 text-emerald-800 ring-emerald-200'
          : 'bg-sky-50 text-sky-800 ring-sky-200'
      }`}
    >
      {isA ? 'Party A' : 'Party B'}
    </span>
  )
}

function TimelineEntry({ item, isLast, onOpenFile }) {
  return (
    <div className={`relative pl-10 ${isLast ? '' : 'pb-4'}`}>
      <span
        className={`absolute left-0 top-1 z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white shadow ${
          item.kind === 'action' ? 'bg-portal-primary' : 'bg-slate-400'
        }`}
      >
        <span className="h-2 w-2 rounded-full bg-white" />
      </span>
      <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
        <p className="text-sm font-semibold text-slate-800">
          {item.label} · {item.name}
          <span className="ml-2 font-normal text-slate-500">
            ({ROLE_LABELS[item.role] || item.role})
          </span>
        </p>
        <p className="text-xs text-slate-400">{formatDate(item.at)}</p>
        {item.comment && (
          <p className="mt-1.5 text-sm text-slate-700">{item.comment}</p>
        )}
        {item.document_url && (
          <div className="mt-2">
            <DocLink
              url={item.document_url}
              title="View attachment"
              onOpen={(url) => onOpenFile(url, 'Timeline attachment')}
            />
          </div>
        )}
      </div>
    </div>
  )
}
