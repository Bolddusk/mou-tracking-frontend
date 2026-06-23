import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as mmApi from '../../api/matchmaking'
import Alert from '../../components/Alert'
import LoadingSpinner from '../../components/LoadingSpinner'
import MmMouStatusBadge from '../../components/matchmaking/MmMouStatusBadge'
import { MM_MATCH_STATUS_LABELS, MM_MATCH_STATUS_STYLES } from '../../constants/matchmaking'
import { useAuth } from '../../context/AuthContext'
import { formatDate, getErrorMessage } from '../../utils/format'

function MatchStatusBadge({ status }) {
  const key = (status || 'created').toLowerCase()
  const style = MM_MATCH_STATUS_STYLES[key] || 'bg-slate-100 text-slate-700 border-slate-200'
  const label = MM_MATCH_STATUS_LABELS[key] || status
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${style}`}>
      {label}
    </span>
  )
}

export default function MmMatchesDashboard({ adminOversight = false }) {
  const navigate = useNavigate()
  const { isSuperAdmin, isSectorLead, isFocalPoint, isRegionalFocalPoint } = useAuth()
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data =
        adminOversight || isSuperAdmin
          ? await mmApi.getAllMmMatches()
          : isSectorLead || isFocalPoint || isRegionalFocalPoint
            ? await mmApi.getMatcherMmMatches()
            : await mmApi.getMyMmMatches()
      setMatches(data)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [adminOversight, isSuperAdmin, isSectorLead, isFocalPoint, isRegionalFocalPoint])

  useEffect(() => {
    load()
  }, [load])

  const rows = useMemo(() => matches, [matches])

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-800">Matches</h3>
        <p className="text-sm text-slate-500">
          {adminOversight ? 'All matches across sectors' : 'Matches in your scope'}
        </p>
      </div>

      <Alert type="error" message={error} onClose={() => setError('')} />

      {loading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner size="lg" />
        </div>
      ) : rows.length === 0 ? (
        <div className="py-16 text-center text-slate-500">No matches yet.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-[900px] w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Side A</th>
                <th className="px-4 py-3 font-semibold">Side B</th>
                <th className="px-4 py-3 font-semibold">Sector</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">MOU</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3 text-slate-700">
                    <span className="font-medium">{m.side_a_country || '—'}</span>
                    <span className="block text-xs text-slate-500">{m.side_a_title || m.side_a_proposal_id}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    <span className="font-medium">{m.side_b_country || '—'}</span>
                    <span className="block text-xs text-slate-500">{m.side_b_title || m.side_b_proposal_id}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{m.sector || '—'}</td>
                  <td className="px-4 py-3">
                    <MatchStatusBadge status={m.status} />
                  </td>
                  <td className="px-4 py-3">
                    <MmMouStatusBadge status={m.mou_status} />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => navigate(`/matchmaking/matches/${m.id}`)}
                      className="text-xs font-semibold text-green-800 hover:underline"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
