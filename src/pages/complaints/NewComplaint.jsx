import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import * as complaintsApi from '../../api/complaints'
import * as proposalsApi from '../../api/proposals'
import { getProposalDisplayTitle } from '../../constants/proposalTemplate'
import Alert from '../../components/Alert'
import LoadingSpinner from '../../components/LoadingSpinner'
import { useAuth } from '../../context/AuthContext'
import {
  COMPLAINT_CATEGORY_LABELS,
  COMPLAINT_PRIORITY_LABELS,
} from '../../utils/complaintDisplay'
import { formatDate, getErrorMessage } from '../../utils/format'

export default function NewComplaint() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { isPartyB } = useAuth()
  const [proposals, setProposals] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    proposal_id: searchParams.get('proposal_id') || '',
    title: '',
    description: '',
    priority: 'normal',
    category: '',
    document_url: '',
  })

  useEffect(() => {
    async function loadOptions() {
      setLoading(true)
      setError('')
      try {
        const props = await proposalsApi.getMyProposals()
        const eligible = (Array.isArray(props) ? props : []).filter((p) => p.status !== 'draft')
        setProposals(eligible)
        setForm((f) => {
          if (f.proposal_id && eligible.some((p) => String(p.id) === String(f.proposal_id))) {
            return f
          }
          return {
            ...f,
            proposal_id: eligible.length > 0 ? String(eligible[0].id) : '',
          }
        })
      } catch (err) {
        setError(getErrorMessage(err))
      } finally {
        setLoading(false)
      }
    }
    loadOptions()
  }, [])

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const { file_url } = await complaintsApi.uploadComplaintDocument(file)
      setForm((f) => ({ ...f, document_url: file_url }))
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.proposal_id || !form.title.trim() || !form.description.trim()) return
    setSubmitting(true)
    setError('')
    try {
      const created = await complaintsApi.createComplaint({
        proposal_id: Number(form.proposal_id),
        title: form.title.trim(),
        description: form.description.trim(),
        priority: form.priority || 'normal',
        category: form.category || undefined,
        document_url: form.document_url || undefined,
      })
      navigate(`/complaints/${created.id}`)
    } catch (err) {
      const existingId = err?.response?.data?.existing_complaint_id
      if (err?.response?.status === 409 && existingId) {
        setError(
          `${getErrorMessage(err)} Open the existing complaint #${existingId}, or change the title.`,
        )
      } else {
        setError(getErrorMessage(err))
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link to="/complaints" className="text-sm font-medium text-green-600 hover:underline">
          ← Back to complaints
        </Link>
        <h3 className="mt-2 text-lg font-semibold text-slate-800">File a Complaint</h3>
        <p className="text-sm text-slate-500">
          {isPartyB
            ? 'Report a grievance related to a proposal you are linked to as Party B.'
            : 'Report a grievance related to one of your submitted proposals.'}{' '}
          The Sector Lead for the MOU sector is assigned automatically.
        </p>
      </div>

      <Alert type="error" message={error} onClose={() => setError('')} />

      {proposals.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
          <p className="text-slate-600">
            {isPartyB
              ? 'No linked proposals yet. You will receive login credentials by email when a proposal with your details is approved.'
              : 'Submit a proposal first before filing a complaint.'}
          </p>
          {!isPartyB && (
            <Link
              to="/proposals/new"
              className="mt-2 inline-block text-sm font-medium text-green-600 hover:underline"
            >
              Create opportunity
            </Link>
          )}
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <Field label="Related Proposal" required>
            <select
              value={form.proposal_id}
              onChange={(e) => setForm((f) => ({ ...f, proposal_id: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              required
            >
              {proposals.map((p) => (
                <option key={p.id} value={p.id}>
                  {getProposalDisplayTitle(p)} — {p.sector} ({p.status}) ·{' '}
                  {formatDate(p.created_at)}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Complaint Title" required>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Delay in MOU follow-up"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              required
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Priority">
              <select
                value={form.priority}
                onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                {Object.entries(COMPLAINT_PRIORITY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Category">
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="">Select (optional)</option>
                {Object.entries(COMPLAINT_CATEGORY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Description" required>
            <textarea
              rows={4}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Describe the issue in detail…"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              required
            />
          </Field>

          <Field label="Supporting Document (optional)">
            <input
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              disabled={uploading}
              onChange={handleUpload}
              className="w-full text-sm text-slate-600 file:mr-2 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm"
            />
            {uploading && <p className="mt-1 text-xs text-slate-500">Uploading…</p>}
            {form.document_url && !uploading && (
              <p className="mt-1 text-xs text-green-600">Document attached ✓</p>
            )}
          </Field>

          <div className="flex justify-end gap-3 pt-2">
            <Link
              to="/complaints"
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting || uploading}
              className="inline-flex items-center gap-2 rounded-lg bg-portal-primary px-4 py-2 text-sm font-semibold text-white hover:bg-portal-primary-hover disabled:opacity-50"
            >
              {submitting && <LoadingSpinner size="sm" />}
              Submit Complaint
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      {children}
    </div>
  )
}
