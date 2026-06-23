import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import * as mmApi from '../../api/matchmaking'
import Alert from '../../components/Alert'
import LoadingSpinner from '../../components/LoadingSpinner'
import MmMouPanel from '../../components/matchmaking/MmMouPanel'
import { useAuth } from '../../context/AuthContext'
import { getErrorMessage } from '../../utils/format'

/**
 * MOU page for matchmaking engagement.
 * Route param is engagement_proposal_id (from Step 12G approve) or match id fallback.
 */
export default function MmEngagementMou() {
  const { id } = useParams()
  const { isPartyA, isPartyB, isSectorLead, isSuperAdmin, user } = useAuth()
  const [match, setMatch] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [mouStatus, setMouStatus] = useState(null)
  const [success, setSuccess] = useState('')

  const resolveMatch = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const byMatchId = await mmApi.getMatchById(id)
      setMatch(byMatchId)
    } catch (matchErr) {
      try {
        const byEngagement = await mmApi.getEngagementMatch(id)
        setMatch(byEngagement)
      } catch {
        setError(getErrorMessage(matchErr))
        setMatch(null)
      }
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    resolveMatch()
  }, [resolveMatch])

  const isDealClosed = mouStatus === 'deal_closed' || match?.mou_status === 'deal_closed'

  const matchIsMouReady = useMemo(() => {
    const status = (match?.status || '').toLowerCase()
    return ['approved', 'active', 'mou_pending'].includes(status)
  }, [match?.status])

  const canEditMou = useMemo(() => {
    if (!match || isDealClosed) return false
    if (!matchIsMouReady) return false
    return isPartyA || isPartyB || isSectorLead || isSuperAdmin
  }, [match, isDealClosed, matchIsMouReady, isPartyA, isPartyB, isSectorLead, isSuperAdmin])

  const canCloseDeal = useMemo(() => {
    if (isDealClosed) return false
    if (!isSectorLead && !isSuperAdmin) return false
    if (mouStatus !== 'signed') return false
    if (isSuperAdmin) return true
    return Boolean(
      isSectorLead &&
        user?.sector &&
        (match?.sector === user.sector || match?.matched_by === user?.id),
    )
  }, [isDealClosed, isSectorLead, isSuperAdmin, mouStatus, user?.sector, user?.id, match?.sector, match?.matched_by])

  const canMarkSigned = (isSectorLead || isSuperAdmin) && !isDealClosed

  const handleDealClosed = useCallback((res) => {
    if (res?.match) {
      setMatch((prev) => (prev ? { ...prev, ...res.match } : prev))
    }
    setMouStatus('deal_closed')
    setSuccess(res?.message || 'Deal closed successfully')
  }, [])
  const engagementId = match?.engagement_proposal_id

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!match) {
    return (
      <div className="mx-auto max-w-lg space-y-4 py-16 text-center">
        <p className="text-slate-600">Match not found for this engagement.</p>
        <Alert type="error" message={error} />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-10">
      <div className="flex flex-wrap items-center gap-3">
        {isSectorLead || isSuperAdmin ? (
          <Link
            to="/matchmaking/matches"
            className="text-sm font-medium text-purple-700 hover:underline"
          >
            ← Matches
          </Link>
        ) : engagementId ? (
          <Link
            to={`/proposals/${engagementId}`}
            className="text-sm font-medium text-purple-700 hover:underline"
          >
            ← Back to engagement
          </Link>
        ) : (
          <Link
            to="/matchmaking/matches"
            className="text-sm font-medium text-purple-700 hover:underline"
          >
            ← Match reviews
          </Link>
        )}
        {engagementId && (
          <Link
            to={`/proposals/${engagementId}`}
            className="text-sm text-slate-600 hover:underline"
          >
            Open chat
          </Link>
        )}
      </div>

      <Alert type="error" message={error} onClose={() => setError('')} />
      <Alert type="success" message={success} onClose={() => setSuccess('')} />

      <div className="rounded-2xl border border-purple-200 bg-purple-50/40 px-6 py-4">
        <h1 className="text-xl font-bold text-slate-900">MOU — Match #{match.id}</h1>
        <p className="mt-1 text-sm text-slate-600">
          {match.side_a_title && match.side_b_title
            ? `${match.side_a_title} ↔ ${match.side_b_title}`
            : match.sector || 'Matchmaking engagement'}
        </p>
      </div>

      <MmMouPanel
        matchId={match.id}
        canEdit={canEditMou}
        canMarkSigned={canMarkSigned}
        canCloseDeal={canCloseDeal}
        onStatusChange={setMouStatus}
        onDealClosed={handleDealClosed}
      />
    </div>
  )
}
