import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import * as complaintsApi from '../../api/complaints'
import * as usersApi from '../../api/users'
import Alert from '../../components/Alert'
import ComplaintStatusBadge from '../../components/ComplaintStatusBadge'
import DocLink from '../../components/DocLink'
import FilePreviewModal from '../../components/FilePreviewModal'
import LoadingSpinner from '../../components/LoadingSpinner'
import Modal from '../../components/Modal'
import PartyBEngagementPanel from '../../components/PartyBEngagementPanel'
import { useAuth } from '../../context/AuthContext'
import { getProposalDisplayTitle } from '../../constants/proposalTemplate'
import { ROLE_LABELS } from '../../constants/sectors'
import { formatDate, getErrorMessage, resolveFileUrl } from '../../utils/format'
import {
  canPostInternalTimeline,
  canRfpActOnComplaint,
  canSectorLeadActOnComplaint,
  canSectorLeadForward,
  canSuperAdminActOnComplaint,
} from '../../utils/complaintPermissions'

const ACTION_LABELS = {
  approved: 'Resolved',
  rejected: 'Rejected',
  forwarded: 'Forwarded',
  returned: 'Returned to Sector Lead',
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
  const [internalDraft, setInternalDraft] = useState('')
  const [internalDocUrl, setInternalDocUrl] = useState('')
  const [internalUploading, setInternalUploading] = useState(false)
  const [filePreview, setFilePreview] = useState(null)

  const [approveOpen, setApproveOpen] = useState(false)
  const [approveComment, setApproveComment] = useState('')
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectComment, setRejectComment] = useState('')
  const [forwardOpen, setForwardOpen] = useState(false)
  const [forwardComment, setForwardComment] = useState('')
  const [forwardTarget, setForwardTarget] = useState('')
  const [returnOpen, setReturnOpen] = useState(false)
  const [returnComment, setReturnComment] = useState('')
  const [rfpList, setRfpList] = useState([])

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

  useEffect(() => {
    if (!isSectorLead || !forwardOpen) return
    usersApi
      .getRegionalFocalPoints()
      .then((list) => {
        setRfpList(Array.isArray(list) ? list : [])
        if (list?.length > 0) setForwardTarget(String(list[0].id))
      })
      .catch(() => setRfpList([]))
  }, [isSectorLead, forwardOpen])

  const isTaggedLead =
    isSectorLead && complaint && canSectorLeadActOnComplaint(complaint, user?.id)

  const canSectorReview = isTaggedLead && complaint
  const canRfpReview =
    isRegionalFocalPoint && complaint && canRfpActOnComplaint(complaint, user?.id)
  const canSuperAdminReview =
    isSuperAdmin && complaint && canSuperAdminActOnComplaint(complaint)

  const canReview = canSectorReview || canRfpReview || canSuperAdminReview
  const canForward =
    isSectorLead && complaint && canSectorLeadForward(complaint, user?.id)

  const engagement = complaint?.party_b_engagement
  const isPartyBTaggedView = isPartyB && Boolean(engagement?.tagged)
  const engagementReadOnly =
    isSectorLead ||
    isSuperAdmin ||
    (isPartyB ? false : !(canRfpReview && complaint?.status === 'forwarded'))

  const canReturn =
    canRfpReview && Boolean(engagement?.can_return_to_sector_lead)

  const showInternalTimeline =
    complaint?.can_view_internal_timeline && !isPartyBTaggedView
  const isReturned = complaint?.status === 'returned_to_sector_lead'
  const showEngagementPanel = Boolean(engagement)

  const handleApprove = async () => {
    setActionLoading(true)
    setError('')
    try {
      await complaintsApi.approveComplaint(id, approveComment.trim() || undefined)
      setApproveOpen(false)
      setApproveComment('')
      setSuccess(
        isReturned && isTaggedLead
          ? 'Complaint resolved — Party A has been notified'
          : 'Complaint resolved'
      )
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

  const handleForward = async () => {
    if (!forwardTarget) return
    setActionLoading(true)
    setError('')
    try {
      await complaintsApi.forwardComplaint(
        id,
        Number(forwardTarget),
        forwardComment.trim() || undefined
      )
      setForwardOpen(false)
      setForwardComment('')
      setSuccess('Complaint forwarded to regional focal point')
      await load()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setActionLoading(false)
    }
  }

  const handleReturn = async () => {
    setActionLoading(true)
    setError('')
    try {
      const res = await complaintsApi.returnComplaintToSectorLead(
        id,
        returnComment.trim() || undefined,
      )
      setReturnOpen(false)
      setReturnComment('')
      const docCount = res.party_b_documents_forwarded?.length || 0
      setSuccess(
        docCount > 0
          ? `Returned to sector lead with ${docCount} Party B document(s) attached`
          : res.message || 'Complaint sent back to sector lead',
      )
      await load()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setActionLoading(false)
    }
  }

  const handleAddComment = async (internal = false) => {
    const text = internal ? internalDraft : commentDraft
    if (!text.trim()) return
    setActionLoading(true)
    setError('')
    try {
      await complaintsApi.addComplaintComment(id, {
        comment: text.trim(),
        visibility: internal ? 'internal' : 'public',
        document_url: internal ? internalDocUrl || undefined : undefined,
      })
      if (internal) {
        setInternalDraft('')
        setInternalDocUrl('')
      } else {
        setCommentDraft('')
      }
      setSuccess(internal ? 'Internal note added to timeline' : 'Comment added')
      await load()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setActionLoading(false)
    }
  }

  const handleInternalFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setInternalUploading(true)
    setError('')
    try {
      const { file_url } = await complaintsApi.uploadComplaintDocument(file)
      setInternalDocUrl(file_url)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setInternalUploading(false)
      e.target.value = ''
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
          to="/complaints"
          className="mt-4 inline-flex text-sm font-medium text-green-600 hover:underline"
        >
          ← Back to complaints
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to={isRegionalFocalPoint ? '/complaints' : dashboardPath}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50"
        >
          ← {isPartyA || isPartyB || isSectorLead || isSuperAdmin ? 'Dashboard' : 'Complaints'}
        </Link>
        <Link to="/complaints" className="text-sm font-medium text-green-600 hover:underline">
          All complaints
        </Link>
      </div>

      <Alert type="error" message={error} onClose={() => setError('')} />
      <Alert type="success" message={success} onClose={() => setSuccess('')} />

      {isReturned && isTaggedLead && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-900">
          Regional focal point returned this complaint
          {engagement?.tagged ? ' with Party B documents' : ''}. Review the internal timeline,
          then resolve for Party A or forward again.
        </div>
      )}

      {isPartyBTaggedView && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Regional FP tagged you on this complaint. Use the engagement thread below to exchange
          comments and documents — internal timeline and public comments are not visible to you.
        </div>
      )}

      {complaint.status === 'forwarded' && canRfpReview && (
        <div className="rounded-lg border border-purple-200 bg-purple-50 px-4 py-3 text-sm text-purple-900">
          This complaint was forwarded to you. Tag Party B from the linked proposal, use the
          engagement thread, then return to the sector lead when ready (Party B must be tagged
          first).
        </div>
      )}

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
              </p>
            </div>
            <ComplaintStatusBadge status={complaint.status} />
          </div>
        </div>

        <div className="grid gap-4 p-6 sm:grid-cols-2">
          <InfoItem label="Proposal" value={getProposalDisplayTitle(complaint)} />
          <InfoItem label="Sector" value={complaint.proposal_sector} />
          <InfoItem label="Tagged Sector Lead" value={complaint.tagged_sector_lead_name} />
          {complaint.forwarded_to_name && (
            <>
              <InfoItem label="Forwarded To" value={complaint.forwarded_to_name} />
              <InfoItem label="Forwarded At" value={formatDate(complaint.forwarded_at)} />
            </>
          )}
          {complaint.returned_at && (
            <>
              <InfoItem label="Returned At" value={formatDate(complaint.returned_at)} />
              <InfoItem label="Returned By" value={complaint.returned_by_name} />
            </>
          )}
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

        {!isPartyBTaggedView && (canReview || canForward || canReturn) && (
          <div className="flex flex-wrap gap-2 border-t border-slate-100 bg-slate-50/50 px-6 py-4">
            {canReview && (
              <>
                <button
                  type="button"
                  onClick={() => setApproveOpen(true)}
                  disabled={actionLoading}
                  className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {isReturned && isTaggedLead ? 'Resolve & Notify Party A' : 'Resolve'}
                </button>
                <button
                  type="button"
                  onClick={() => setRejectOpen(true)}
                  disabled={actionLoading}
                  className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-800 hover:bg-red-100 disabled:opacity-50"
                >
                  Reject
                </button>
              </>
            )}
            {canForward && (
              <button
                type="button"
                onClick={() => setForwardOpen(true)}
                disabled={actionLoading}
                className="rounded-lg border border-purple-200 bg-purple-50 px-4 py-2 text-sm font-semibold text-purple-800 hover:bg-purple-100 disabled:opacity-50"
              >
                Forward to Regional FP
              </button>
            )}
            {canReturn && (
              <button
                type="button"
                onClick={() => setReturnOpen(true)}
                disabled={actionLoading}
                className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-900 hover:bg-orange-100 disabled:opacity-50"
              >
                Send Back to Sector Lead
              </button>
            )}
          </div>
        )}
      </div>

      {showEngagementPanel && (
        <PartyBEngagementPanel
          complaintId={id}
          engagement={engagement}
          readOnly={engagementReadOnly}
          onRefresh={load}
          onOpenFile={(url, title) => setFilePreview({ url, title })}
        />
      )}

      {!isPartyBTaggedView && complaint.actions?.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="text-lg font-semibold text-slate-800">Action History</h2>
          </div>
          <div className="divide-y divide-slate-100 px-6">
            {complaint.actions.map((a) => (
              <div key={a.id} className="py-4 text-sm">
                <p className="font-semibold text-slate-800">
                  {ACTION_LABELS[a.action] || a.action} · {a.action_by_name}
                  <span className="ml-2 font-normal text-slate-500">
                    ({ROLE_LABELS[a.action_by_role] || a.action_by_role})
                  </span>
                </p>
                <p className="text-xs text-slate-400">{formatDate(a.actioned_at)}</p>
                {a.comment && (
                  <p className="mt-1 italic text-slate-600">&ldquo;{a.comment}&rdquo;</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {showInternalTimeline && (
        <section className="rounded-2xl border border-indigo-200 bg-indigo-50/30 shadow-sm">
          <div className="border-b border-indigo-100 px-6 py-4">
            <h2 className="text-lg font-semibold text-indigo-900">Internal Timeline</h2>
            <p className="text-xs text-indigo-700">
              Visible only to Sector Lead, Regional FP, and Super Admin
            </p>
          </div>
          <div className="px-6 py-4">
            {(complaint.internal_timeline || []).length === 0 ? (
              <p className="py-4 text-center text-sm text-indigo-600/80">
                No internal notes yet.
              </p>
            ) : (
              <div className="relative space-y-0">
                <div className="absolute bottom-2 left-[11px] top-2 w-0.5 bg-indigo-200" />
                {complaint.internal_timeline.map((c, i) => (
                  <TimelineEntry
                    key={c.id}
                    entry={c}
                    isLast={i === complaint.internal_timeline.length - 1}
                    onOpenFile={(url, title) =>
                      setFilePreview({ url: resolveFileUrl(url), title })
                    }
                  />
                ))}
              </div>
            )}

            {canPostInternalTimeline(complaint) && (
              <div className="mt-4 space-y-2 border-t border-indigo-100 pt-4">
                <textarea
                  rows={2}
                  value={internalDraft}
                  onChange={(e) => setInternalDraft(e.target.value)}
                  placeholder="Internal note for sector lead / regional FP…"
                  className="w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    disabled={internalUploading}
                    onChange={handleInternalFile}
                    className="text-xs text-slate-600 file:mr-2 file:rounded-lg file:border-0 file:bg-indigo-100 file:px-3 file:py-1.5 file:text-xs"
                  />
                  {internalUploading && (
                    <span className="text-xs text-slate-500">Uploading…</span>
                  )}
                  {internalDocUrl && !internalUploading && (
                    <span className="text-xs text-green-600">Document attached ✓</span>
                  )}
                  <button
                    type="button"
                    disabled={actionLoading || internalUploading || !internalDraft.trim()}
                    onClick={() => handleAddComment(true)}
                    className="ml-auto rounded-lg bg-indigo-700 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-800 disabled:opacity-50"
                  >
                    Add to Timeline
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {!isPartyBTaggedView && (
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="text-lg font-semibold text-slate-800">Public Comments</h2>
            <p className="text-xs text-slate-500">Visible to Party A and all reviewers</p>
          </div>
          <div className="px-6 py-4">
            {(complaint.comments || []).length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-500">No public comments yet.</p>
            ) : (
              <div className="space-y-3">
                {complaint.comments.map((c) => (
                  <CommentCard
                    key={c.id}
                    comment={c}
                    onOpenFile={(url, title) =>
                      setFilePreview({ url: resolveFileUrl(url), title })
                    }
                  />
                ))}
              </div>
            )}

            <div className="mt-4 flex gap-2 border-t border-slate-100 pt-4">
              <input
                type="text"
                value={commentDraft}
                onChange={(e) => setCommentDraft(e.target.value)}
                placeholder="Add a public comment…"
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100"
              />
              <button
                type="button"
                disabled={actionLoading || !commentDraft.trim()}
                onClick={() => handleAddComment(false)}
                className="rounded-lg bg-sidebar px-4 py-2 text-sm font-semibold text-white hover:bg-sidebar-hover disabled:opacity-50"
              >
                Post
              </button>
            </div>
          </div>
        </section>
      )}

      <Modal
        open={approveOpen}
        title={isReturned && isTaggedLead ? 'Resolve for Party A' : 'Resolve Complaint'}
        onClose={() => setApproveOpen(false)}
        onConfirm={handleApprove}
        confirmLabel="Resolve"
        loading={actionLoading}
      >
        <p className="mb-3 text-sm text-slate-600">
          {isReturned && isTaggedLead
            ? 'Mark as resolved and notify Party A that their grievance is closed.'
            : 'Mark this complaint as resolved. Optional note will be logged.'}
        </p>
        <textarea
          rows={3}
          value={approveComment}
          onChange={(e) => setApproveComment(e.target.value)}
          placeholder="Optional resolution note"
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
        open={forwardOpen}
        title="Forward to Regional Focal Point"
        onClose={() => setForwardOpen(false)}
        onConfirm={handleForward}
        confirmLabel="Forward"
        loading={actionLoading}
        confirmDisabled={!forwardTarget}
      >
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Regional Focal Point
            </label>
            <select
              value={forwardTarget}
              onChange={(e) => setForwardTarget(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              {rfpList.length === 0 ? (
                <option value="">No regional focal points available</option>
              ) : (
                rfpList.map((rfp) => (
                  <option key={rfp.id} value={rfp.id}>
                    {rfp.full_name} — {rfp.sector}
                  </option>
                ))
              )}
            </select>
          </div>
          <textarea
            rows={3}
            value={forwardComment}
            onChange={(e) => setForwardComment(e.target.value)}
            placeholder="Optional note (saved to internal timeline)"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
      </Modal>

      <Modal
        open={returnOpen}
        title="Send Back to Sector Lead"
        onClose={() => setReturnOpen(false)}
        onConfirm={handleReturn}
        confirmLabel="Send Back"
        loading={actionLoading}
      >
        <p className="mb-3 text-sm text-slate-600">
          Return this complaint to {complaint.tagged_sector_lead_name}. Party B documents from the
          engagement thread will be copied to the internal timeline for the sector lead.
        </p>
        <textarea
          rows={3}
          value={returnComment}
          onChange={(e) => setReturnComment(e.target.value)}
          placeholder="Optional note for sector lead"
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
      <div className="mt-1 text-sm font-medium text-slate-800">
        {children || value || '—'}
      </div>
    </div>
  )
}

function CommentCard({ comment, onOpenFile }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-4">
      <p className="text-sm font-semibold text-slate-800">{comment.commented_by_name}</p>
      <p className="text-xs text-slate-400">
        {ROLE_LABELS[comment.commented_by_role] || comment.commented_by_role} ·{' '}
        {formatDate(comment.created_at)}
      </p>
      <p className="mt-1.5 text-sm text-slate-700">{comment.comment}</p>
      {comment.document_url && (
        <div className="mt-2">
          <DocLink
            url={comment.document_url}
            title="View attachment"
            onOpen={(url) => onOpenFile(url, 'Comment attachment')}
          />
        </div>
      )}
    </div>
  )
}

function TimelineEntry({ entry, isLast, onOpenFile }) {
  return (
    <div className={`relative pl-10 ${isLast ? '' : 'pb-4'}`}>
      <span className="absolute left-0 top-1 z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-indigo-500 shadow">
        <span className="h-2 w-2 rounded-full bg-white" />
      </span>
      <div className="rounded-lg border border-indigo-100 bg-white p-3 shadow-sm">
        <p className="text-sm font-semibold text-slate-800">{entry.commented_by_name}</p>
        <p className="text-xs text-indigo-600">
          {ROLE_LABELS[entry.commented_by_role] || entry.commented_by_role} ·{' '}
          {formatDate(entry.created_at)}
        </p>
        <p className="mt-1.5 text-sm text-slate-700">{entry.comment}</p>
        {entry.document_url && (
          <div className="mt-2">
            <DocLink
              url={entry.document_url}
              title="View timeline document"
              onOpen={(url) => onOpenFile(url, 'Timeline document')}
            />
          </div>
        )}
      </div>
    </div>
  )
}
