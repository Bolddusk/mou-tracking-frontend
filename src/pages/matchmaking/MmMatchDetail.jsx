import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import * as mmApi from '../../api/matchmaking'
import Alert from '../../components/Alert'
import LoadingSpinner from '../../components/LoadingSpinner'
import MmMouStatusBadge from '../../components/matchmaking/MmMouStatusBadge'
import { formatDate, getErrorMessage } from '../../utils/format'

export default function MmMatchDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [match, setMatch] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await mmApi.getMatchById(id)
      setMatch(data)
    } catch (err) {
      setError(getErrorMessage(err))
      setMatch(null)
    } finally {
      setLoading(false)
    }
  }, [id])

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

  if (!match) {
    return (
      <div className="py-16 text-center text-slate-500">
        Match not found
        <Link to="/matchmaking/matches" className="mt-2 block text-green-700 hover:underline">
          ← Matches
        </Link>
      </div>
    )
  }

  const engagementId = match.engagement_proposal_id

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-10">
      <Link to="/matchmaking/matches" className="text-sm font-medium text-green-700 hover:underline">
        ← Matches
      </Link>

      <Alert type="error" message={error} onClose={() => setError('')} />

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              Match #{match.id}
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">{match.sector || 'Matchmaking match'}</h1>
            <p className="mt-1 text-sm text-slate-600">Created {formatDate(match.created_at)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <MmMouStatusBadge status={match.mou_status} />
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <ProposalSideCard label="Side A" proposal={match.side_a_proposal || match.side_a} />
          <ProposalSideCard label="Side B" proposal={match.side_b_proposal || match.side_b} />
        </div>

        {engagementId && (
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => navigate(`/proposals/${engagementId}`)}
              className="rounded-lg bg-portal-primary px-4 py-2 text-sm font-semibold text-white hover:bg-portal-primary-hover"
            >
              Open engagement (chat &amp; activities)
            </button>
            <button
              type="button"
              onClick={() => navigate(`/matchmaking/matches/${match.id}/mou`)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              MOU tab
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function ProposalSideCard({ label, proposal }) {
  if (!proposal) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
        {label} — no data
      </div>
    )
  }
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-slate-800">{proposal.title || `Proposal #${proposal.id}`}</p>
      <p className="mt-1 text-sm text-slate-600">
        {proposal.country || '—'} · {proposal.sector || '—'}
      </p>
      {proposal.submitter_name && (
        <p className="mt-2 text-xs text-slate-500">{proposal.submitter_name}</p>
      )}
      <Link
        to={`/matchmaking/${proposal.id}`}
        className="mt-3 inline-block text-xs font-semibold text-green-800 hover:underline"
      >
        View proposal
      </Link>
    </div>
  )
}
