import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as mmApi from '../../api/matchmaking'
import Alert from '../../components/Alert'
import LoadingSpinner from '../../components/LoadingSpinner'
import MmProposalStatusBadge from '../../components/matchmaking/MmProposalStatusBadge'
import ProposalSearchInput from '../../components/proposals/ProposalSearchInput'
import { filterMmProposalsBySearch } from '../../constants/matchmaking'
import { formatDate, getErrorMessage } from '../../utils/format'

export default function MmForwardedDashboard({ adminOversight = false }) {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [proposals, setProposals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await mmApi.getForwardedMmProposals()
      setProposals(data)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const visible = useMemo(
    () => filterMmProposalsBySearch(proposals, searchQuery),
    [proposals, searchQuery],
  )

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-800">Forwarded to Me</h3>
        <p className="text-sm text-slate-500">
          {adminOversight
            ? 'All forwarded proposals across sectors'
            : 'Proposals forwarded to your sector for matching'}
        </p>
      </div>

      <Alert type="error" message={error} onClose={() => setError('')} />

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-4 sm:px-6">
          <ProposalSearchInput value={searchQuery} onChange={setSearchQuery} />
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner size="lg" />
          </div>
        ) : visible.length === 0 ? (
          <div className="py-16 text-center text-slate-500">No forwarded proposals.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Submitter</th>
                  <th className="px-4 py-3 font-semibold">Country</th>
                  <th className="px-4 py-3 font-semibold">Sector</th>
                  <th className="px-4 py-3 font-semibold">Title</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 text-slate-600">{p.submitter_name || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{p.country || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{p.sector || '—'}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{p.title || '—'}</td>
                    <td className="px-4 py-3">
                      <MmProposalStatusBadge status={p.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatDate(p.submitted_at || p.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => navigate(`/matchmaking/${p.id}`)}
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
    </div>
  )
}
