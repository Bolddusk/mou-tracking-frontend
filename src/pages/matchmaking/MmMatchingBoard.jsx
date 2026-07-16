import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as mmApi from '../../api/matchmaking'
import Alert from '../../components/Alert'
import LoadingSpinner from '../../components/LoadingSpinner'
import PartyBCredentialsModal from '../../components/PartyBCredentialsModal'
import { getErrorMessage } from '../../utils/format'

function ProposalCard({ proposal, selected, onSelect }) {
  if (!proposal) return null
  return (
    <button
      type="button"
      onClick={() => onSelect(proposal)}
      className={`w-full rounded-xl border p-4 text-left transition-colors ${
        selected
          ? 'border-portal-primary bg-green-50 ring-2 ring-portal-primary/30'
          : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      <p className="text-xs font-semibold uppercase text-slate-500">
        {proposal.country || '—'} · {proposal.sector || '—'}
      </p>
      <p className="mt-1 font-semibold text-slate-800">{proposal.title || `Proposal #${proposal.id}`}</p>
      <p className="mt-1 text-xs text-slate-500">{proposal.submitter_name || proposal.submitter_email || ''}</p>
    </button>
  )
}

export default function MmMatchingBoard({ adminOversight = false }) {
  const navigate = useNavigate()
  const [sideA, setSideA] = useState([])
  const [sideB, setSideB] = useState([])
  const [selectedA, setSelectedA] = useState(null)
  const [selectedB, setSelectedB] = useState(null)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [engagementId, setEngagementId] = useState(null)
  const [matchId, setMatchId] = useState(null)
  const [partyBCredentials, setPartyBCredentials] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await mmApi.getAllForMatching()
      setSideA(data.sideA || [])
      setSideB(data.sideB || [])
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const canCreate = useMemo(() => {
    if (!selectedA || !selectedB) return false
    if (!selectedA.sector || !selectedB.sector) return true
    return selectedA.sector === selectedB.sector
  }, [selectedA, selectedB])

  const handleCreate = async () => {
    if (!canCreate) return
    setSubmitting(true)
    setError('')
    setSuccess('')
    try {
      const res = await mmApi.createMmMatch(selectedA.id, selectedB.id, comment)
      const engId = res.engagement_proposal_id ?? res.match?.engagement_proposal_id
      const mId = res.match_id ?? res.match?.id
      setEngagementId(engId ?? null)
      setMatchId(mId ?? null)
      const existing =
        res.party_b?.existing_account && !(res.party_b?.account_created && res.party_b?.credentials)
          ? 'Existing Party B account linked. They can use their current login.'
          : ''
      setSuccess(
        [res.message || `Match created — engagement #${engId}`, existing].filter(Boolean).join(' · '),
      )
      if (res.party_b?.account_created && res.party_b?.credentials) {
        setPartyBCredentials(res.party_b.credentials)
      }
      await load()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-800">Matching Board</h3>
        <p className="text-sm text-slate-500">
          Select one Side A and one Side B proposal (same sector recommended) to create a match.
        </p>
      </div>

      <Alert type="error" message={error} onClose={() => setError('')} />
      <Alert type="success" message={success} onClose={() => setSuccess('')} />

      {engagementId && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-4">
          <p className="text-sm font-medium text-green-900">
            Match #{matchId} · Engagement #{engagementId}
          </p>
          <button
            type="button"
            onClick={() => navigate(`/proposals/${engagementId}`)}
            className="mt-3 rounded-lg bg-portal-primary px-4 py-2 text-sm font-semibold text-white"
          >
            Open engagement
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <section>
              <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">
                Side A Proposals
              </h4>
              <div className="max-h-[28rem] space-y-2 overflow-y-auto">
                {sideA.length === 0 ? (
                  <p className="text-sm text-slate-500">No Side A proposals ready.</p>
                ) : (
                  sideA.map((p) => (
                    <ProposalCard
                      key={p.id}
                      proposal={p}
                      selected={selectedA?.id === p.id}
                      onSelect={setSelectedA}
                    />
                  ))
                )}
              </div>
            </section>
            <section>
              <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">
                Side B Proposals
              </h4>
              <div className="max-h-[28rem] space-y-2 overflow-y-auto">
                {sideB.length === 0 ? (
                  <p className="text-sm text-slate-500">No Side B proposals ready.</p>
                ) : (
                  sideB.map((p) => (
                    <ProposalCard
                      key={p.id}
                      proposal={p}
                      selected={selectedB?.id === p.id}
                      onSelect={setSelectedB}
                    />
                  ))
                )}
              </div>
            </section>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <textarea
              rows={2}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Optional match comment"
              className="mb-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={handleCreate}
              disabled={!canCreate || submitting}
              className="rounded-lg bg-portal-primary px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {submitting ? 'Creating…' : 'Create Match'}
            </button>
            {selectedA && selectedB && selectedA.sector !== selectedB.sector && (
              <p className="mt-2 text-xs text-amber-700">Sector mismatch — select proposals in the same sector.</p>
            )}
          </div>
        </>
      )}

      <PartyBCredentialsModal
        open={Boolean(partyBCredentials)}
        credentials={partyBCredentials}
        onClose={() => {
          setPartyBCredentials(null)
          if (engagementId) navigate(`/proposals/${engagementId}`)
        }}
      />
    </div>
  )
}
