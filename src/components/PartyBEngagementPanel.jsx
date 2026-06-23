import { useState } from 'react'
import * as complaintsApi from '../api/complaints'
import Alert from './Alert'
import DocLink from './DocLink'
import LoadingSpinner from './LoadingSpinner'
import Modal from './Modal'
import { ROLE_LABELS } from '../constants/sectors'
import { formatDate, getErrorMessage, resolveFileUrl } from '../utils/format'

const TYPE_LABELS = {
  tag: 'Party B tagged',
  poke: 'Poke for update',
  poke_response: 'Poke response',
  comment: 'Comment',
}

export default function PartyBEngagementPanel({
  complaintId,
  engagement,
  readOnly = false,
  onRefresh,
  onOpenFile,
}) {
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)

  const [tagOpen, setTagOpen] = useState(false)
  const [tagComment, setTagComment] = useState('')
  const [pokeOpen, setPokeOpen] = useState(false)
  const [pokeComment, setPokeComment] = useState('')

  const [threadComment, setThreadComment] = useState('')
  const [threadDocUrl, setThreadDocUrl] = useState('')

  const [respondOpen, setRespondOpen] = useState(false)
  const [respondForm, setRespondForm] = useState({
    activity_date: '',
    title: '',
    description: '',
    comment: '',
    document_url: '',
  })

  if (!engagement) return null

  const items = engagement.items || []
  const pendingPoke = items.find(
    (item) => item.type === 'poke' && item.id === engagement.pending_poke_id,
  )

  const handleTag = async () => {
    setLoading(true)
    setError('')
    try {
      await complaintsApi.tagPartyB(complaintId, tagComment.trim() || undefined)
      setTagOpen(false)
      setTagComment('')
      setSuccess('Party B tagged — they can now view this complaint')
      await onRefresh?.()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const handlePoke = async () => {
    setLoading(true)
    setError('')
    try {
      await complaintsApi.pokePartyB(complaintId, pokeComment.trim() || undefined)
      setPokeOpen(false)
      setPokeComment('')
      setSuccess('Party B poked for documents/update')
      await onRefresh?.()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const handleThreadUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const { file_url } = await complaintsApi.uploadPartyBEngagementDocument(complaintId, file)
      setThreadDocUrl(file_url)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleThreadComment = async () => {
    if (!threadComment.trim() && !threadDocUrl) return
    setLoading(true)
    setError('')
    try {
      await complaintsApi.addPartyBEngagementComment(complaintId, {
        comment: threadComment.trim() || undefined,
        document_url: threadDocUrl || undefined,
      })
      setThreadComment('')
      setThreadDocUrl('')
      setSuccess('Added to engagement thread')
      await onRefresh?.()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const handleRespondUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const { file_url } = await complaintsApi.uploadPartyBEngagementDocument(complaintId, file)
      setRespondForm((f) => ({ ...f, document_url: file_url }))
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleRespond = async () => {
    if (!respondForm.activity_date || !respondForm.title.trim()) return
    setLoading(true)
    setError('')
    try {
      await complaintsApi.respondToPartyBPoke(complaintId, {
        activity_date: respondForm.activity_date,
        title: respondForm.title.trim(),
        description: respondForm.description.trim() || undefined,
        comment: respondForm.comment.trim() || undefined,
        document_url: respondForm.document_url || undefined,
      })
      setRespondOpen(false)
      setRespondForm({
        activity_date: '',
        title: '',
        description: '',
        comment: '',
        document_url: '',
      })
      setSuccess('Poke response submitted')
      await onRefresh?.()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const showThreadForm = !readOnly && engagement.tagged

  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50/20 shadow-sm">
      <div className="border-b border-amber-100 px-6 py-4">
        <h2 className="text-lg font-semibold text-amber-950">Party B Engagement</h2>
        <p className="text-xs text-amber-800/80">
          Private thread between Regional FP and Party B — not visible to Party A
        </p>
        {engagement.tagged && (
          <p className="mt-2 text-sm text-amber-900">
            <strong>{engagement.party_b_name || 'Party B'}</strong>
            {engagement.party_b_email ? ` · ${engagement.party_b_email}` : ''}
            {engagement.tagged_at ? ` · tagged ${formatDate(engagement.tagged_at)}` : ''}
          </p>
        )}
      </div>

      <div className="px-6 py-4">
        <Alert type="error" message={error} onClose={() => setError('')} />
        <Alert type="success" message={success} onClose={() => setSuccess('')} />

        {!readOnly && engagement.can_tag_party_b && (
          <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
            <p className="text-sm text-amber-900">
              Tag Party B from the linked proposal so they can assist with regional documentation.
            </p>
            <button
              type="button"
              onClick={() => setTagOpen(true)}
              disabled={loading}
              className="mt-2 rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800 disabled:opacity-50"
            >
              Tag Party B
            </button>
          </div>
        )}

        {!readOnly && engagement.can_poke_party_b && (
          <div className="mb-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setPokeOpen(true)}
              disabled={loading}
              className="rounded-lg border border-orange-300 bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-900 hover:bg-orange-100 disabled:opacity-50"
            >
              Poke Party B
            </button>
          </div>
        )}

        {!readOnly && engagement.can_respond_to_poke && pendingPoke && (
          <div className="mb-4 rounded-lg border border-green-300 bg-green-50 px-4 py-3">
            <p className="text-sm font-semibold text-green-900">Regional FP requested an update</p>
            <p className="mt-1 text-sm text-green-800">{pendingPoke.comment}</p>
            <button
              type="button"
              onClick={() => setRespondOpen(true)}
              disabled={loading}
              className="mt-2 rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50"
            >
              Respond to Poke
            </button>
          </div>
        )}

        {items.length === 0 ? (
          <p className="py-6 text-center text-sm text-amber-800/70">
            {engagement.tagged ? 'No thread activity yet.' : 'Tag Party B to start engagement.'}
          </p>
        ) : (
          <div className="relative space-y-0">
            <div className="absolute bottom-2 left-[11px] top-2 w-0.5 bg-amber-200" />
            {items.map((item, i) => (
              <EngagementItem
                key={item.id}
                item={item}
                isLast={i === items.length - 1}
                onOpenFile={onOpenFile}
              />
            ))}
          </div>
        )}

        {showThreadForm && (
          <div className="mt-4 space-y-2 border-t border-amber-100 pt-4">
            <textarea
              rows={2}
              value={threadComment}
              onChange={(e) => setThreadComment(e.target.value)}
              placeholder="Comment for Party B / Regional FP…"
              className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
            />
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                disabled={uploading}
                onChange={handleThreadUpload}
                className="text-xs text-slate-600 file:mr-2 file:rounded-lg file:border-0 file:bg-amber-100 file:px-3 file:py-1.5 file:text-xs"
              />
              {uploading && <span className="text-xs text-slate-500">Uploading…</span>}
              {threadDocUrl && !uploading && (
                <span className="text-xs text-green-600">Document attached ✓</span>
              )}
              <button
                type="button"
                disabled={loading || uploading || (!threadComment.trim() && !threadDocUrl)}
                onClick={handleThreadComment}
                className="ml-auto rounded-lg bg-amber-800 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-900 disabled:opacity-50"
              >
                {loading ? 'Posting…' : 'Post to Thread'}
              </button>
            </div>
          </div>
        )}
      </div>

      <Modal
        open={tagOpen}
        title="Tag Party B"
        onClose={() => setTagOpen(false)}
        onConfirm={handleTag}
        confirmLabel="Tag Party B"
        loading={loading}
      >
        <p className="mb-3 text-sm text-slate-600">
          Party B from the linked proposal will gain access to this complaint and the private
          engagement thread.
        </p>
        <textarea
          rows={3}
          value={tagComment}
          onChange={(e) => setTagComment(e.target.value)}
          placeholder="Optional note for Party B"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
      </Modal>

      <Modal
        open={pokeOpen}
        title="Poke Party B"
        onClose={() => setPokeOpen(false)}
        onConfirm={handlePoke}
        confirmLabel="Send Poke"
        loading={loading}
      >
        <p className="mb-3 text-sm text-slate-600">
          Request documents or an update. Only one pending poke at a time.
        </p>
        <textarea
          rows={3}
          value={pokeComment}
          onChange={(e) => setPokeComment(e.target.value)}
          placeholder="What do you need from Party B?"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
      </Modal>

      <Modal
        open={respondOpen}
        title="Respond to Poke"
        onClose={() => setRespondOpen(false)}
        onConfirm={handleRespond}
        confirmLabel="Submit Response"
        loading={loading}
        confirmDisabled={!respondForm.activity_date || !respondForm.title.trim()}
      >
        <div className="space-y-3 text-sm">
          <Field
            label="Work date"
            type="date"
            value={respondForm.activity_date}
            onChange={(v) => setRespondForm((f) => ({ ...f, activity_date: v }))}
            required
          />
          <Field
            label="Title"
            value={respondForm.title}
            onChange={(v) => setRespondForm((f) => ({ ...f, title: v }))}
            required
          />
          <Field
            label="Description"
            value={respondForm.description}
            onChange={(v) => setRespondForm((f) => ({ ...f, description: v }))}
          />
          <Field
            label="Comment"
            value={respondForm.comment}
            onChange={(v) => setRespondForm((f) => ({ ...f, comment: v }))}
          />
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Document</label>
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              disabled={uploading}
              onChange={handleRespondUpload}
              className="text-xs text-slate-600 file:mr-2 file:rounded-lg file:border-0 file:bg-green-100 file:px-3 file:py-1.5 file:text-xs"
            />
            {uploading && <LoadingSpinner size="sm" />}
            {respondForm.document_url && !uploading && (
              <p className="mt-1 text-xs text-green-600">Document attached ✓</p>
            )}
          </div>
        </div>
      </Modal>
    </section>
  )
}

function EngagementItem({ item, isLast, onOpenFile }) {
  const isPoke = item.type === 'poke'
  const isResponse = item.type === 'poke_response'
  const dotColor = isResponse ? 'bg-green-500' : isPoke ? 'bg-orange-500' : 'bg-amber-500'

  return (
    <div className={`relative pl-10 ${isLast ? '' : 'pb-4'}`}>
      <span
        className={`absolute left-0 top-1 z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white ${dotColor} shadow`}
      >
        <span className="h-2 w-2 rounded-full bg-white" />
      </span>
      <div
        className={`rounded-lg border p-3 shadow-sm ${
          isPoke
            ? 'border-orange-200 bg-orange-50/50'
            : isResponse
              ? 'border-green-200 bg-green-50/50'
              : 'border-amber-100 bg-white'
        }`}
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {TYPE_LABELS[item.type] || item.type}
        </p>
        <p className="text-sm font-semibold text-slate-800">
          {item.author_name}
          <span className="ml-2 font-normal text-slate-500">
            ({ROLE_LABELS[item.author_role] || item.author_role})
          </span>
        </p>
        <p className="text-xs text-slate-400">{formatDate(item.created_at)}</p>
        {item.comment && <p className="mt-1.5 text-sm text-slate-700">{item.comment}</p>}
        {isPoke && item.is_answered && (
          <p className="mt-1 text-xs font-medium text-green-700">Answered</p>
        )}
        {isResponse && item.poke_response && (
          <div className="mt-2 rounded border border-green-100 bg-white/80 p-2 text-sm">
            <p>
              <span className="font-medium">Date:</span>{' '}
              {formatDate(item.poke_response.work_date)}
            </p>
            <p>
              <span className="font-medium">Title:</span> {item.poke_response.title}
            </p>
            {item.poke_response.description && (
              <p className="mt-1 text-slate-600">{item.poke_response.description}</p>
            )}
            {item.poke_response.document_url && (
              <div className="mt-2">
                <DocLink
                  url={item.poke_response.document_url}
                  title="View response document"
                  onOpen={(url) =>
                    onOpenFile(resolveFileUrl(url), `Poke response — ${item.poke_response.title}`)
                  }
                />
              </div>
            )}
          </div>
        )}
        {item.document_url && (
          <div className="mt-2">
            <DocLink
              url={item.document_url}
              title="View attachment"
              onOpen={(url) => onOpenFile(resolveFileUrl(url), 'Engagement document')}
            />
          </div>
        )}
      </div>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', required }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        {label}
        {required && ' *'}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100"
      />
    </div>
  )
}
