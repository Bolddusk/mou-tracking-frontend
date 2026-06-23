import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import * as mmApi from '../../api/matchmaking'
import Alert from '../../components/Alert'
import DocLink from '../../components/DocLink'
import LoadingSpinner from '../../components/LoadingSpinner'
import MmProposalStatusBadge from '../../components/matchmaking/MmProposalStatusBadge'
import { formatKeywordsDisplay } from '../../constants/matchmaking'
import { formatDate, formatUsd, getErrorMessage } from '../../utils/format'

export default function MmProposalDetail({ adminOversight = false }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const listPath = adminOversight ? '/matchmaking/admin/my-proposals' : '/matchmaking/my-proposals'
  const [proposal, setProposal] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await mmApi.getMmProposalById(id)
      if (data?.status === 'matched' && data?.engagement_proposal_id) {
        navigate(`/proposals/${data.engagement_proposal_id}`, { replace: true })
        return
      }
      setProposal(data)
    } catch (err) {
      setError(getErrorMessage(err))
      setProposal(null)
    } finally {
      setLoading(false)
    }
  }, [id, navigate])

  useEffect(() => {
    load()
  }, [load])

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!proposal) {
    return (
      <div className="py-16 text-center text-slate-500">
        Proposal not found
        <Link to={listPath} className="mt-2 block text-green-700 hover:underline">
          ← My proposals
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-10">
      <Link to={listPath} className="text-sm font-medium text-green-700 hover:underline">
        ← My proposals
      </Link>

      <Alert type="error" message={error} onClose={() => setError('')} />

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              Proposal #{proposal.id} · {proposal.side || '—'}
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">{proposal.title || 'Untitled'}</h1>
            <p className="mt-1 text-sm text-slate-600">
              {proposal.country || '—'} · {proposal.sector || '—'}
            </p>
          </div>
          <MmProposalStatusBadge status={proposal.status} />
        </div>

        <dl className="mt-6 space-y-4 text-sm">
          <InfoRow label="Description" value={proposal.description} multiline />
          <InfoRow
            label="Investment amount"
            value={proposal.investment_amount != null ? formatUsd(proposal.investment_amount) : '—'}
          />
          <InfoRow label="Keywords" value={formatKeywordsDisplay(proposal.keywords) || '—'} />
          <InfoRow label="Submitter" value={proposal.submitter_name || proposal.submitter_email || '—'} />
          <InfoRow label="Submitted" value={formatDate(proposal.submitted_at || proposal.created_at)} />
          {proposal.sector_lead_comment && (
            <InfoRow label="Review comment" value={proposal.sector_lead_comment} multiline />
          )}
          <div>
            <dt className="font-medium text-slate-500">File</dt>
            <dd className="mt-1">
              <DocLink url={proposal.file_url} title="View proposal file" />
            </dd>
          </div>
        </dl>
      </div>
    </div>
  )
}

function InfoRow({ label, value, multiline }) {
  return (
    <div>
      <dt className="font-medium text-slate-500">{label}</dt>
      <dd className={`mt-0.5 text-slate-800 ${multiline ? 'whitespace-pre-wrap' : ''}`}>{value || '—'}</dd>
    </div>
  )
}
