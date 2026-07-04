import LoadingSpinner from '../LoadingSpinner'
import OperationalStatusBadge from './OperationalStatusBadge'
import { formatProposalConferenceDate, getMouConferenceRow } from '../../utils/mouConferenceFields'

export default function ProposalConferenceMouTable({
  proposals,
  loading,
  emptyMessage = 'No conference MOUs found.',
  onView,
  renderActions,
}) {
  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!proposals.length) {
    return <div className="py-16 text-center text-slate-500">{emptyMessage}</div>
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-[1100px] w-full text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            <th className="px-3 py-3 font-semibold">Pakistani Company</th>
            <th className="px-3 py-3 font-semibold">Chinese Company</th>
            <th className="px-3 py-3 font-semibold">Sector</th>
            <th className="px-3 py-3 font-semibold">SIFC Category</th>
            <th className="px-3 py-3 font-semibold">Mode</th>
            <th className="px-3 py-3 font-semibold">MoU Value</th>
            <th className="px-3 py-3 font-semibold">Status</th>
            <th className="px-3 py-3 font-semibold">Conference Dates</th>
            <th className="px-3 py-3 font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {proposals.map((p) => {
            const row = getMouConferenceRow(p)
            return (
              <tr
                key={p.id}
                className="cursor-pointer hover:bg-slate-50/80"
                onClick={() => onView?.(p.id)}
              >
                <td className="max-w-[160px] truncate px-3 py-3 font-medium text-slate-800" title={row.pakistaniCompany}>
                  {row.pakistaniCompany}
                </td>
                <td className="max-w-[160px] truncate px-3 py-3 text-slate-700" title={row.chineseCompany}>
                  {row.chineseCompany}
                </td>
                <td className="max-w-[140px] truncate px-3 py-3 text-slate-600" title={row.sector}>
                  {row.sector}
                </td>
                <td className="max-w-[140px] truncate px-3 py-3 text-slate-600" title={row.sifcCategory}>
                  {row.sifcCategory}
                </td>
                <td className="px-3 py-3 text-slate-600">{row.cooperationMode}</td>
                <td className="whitespace-nowrap px-3 py-3 text-slate-700">{row.mouValue}</td>
                <td className="px-3 py-3">
                  <OperationalStatusBadge status={row.operationalStatus} />
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-slate-600">
                  {formatProposalConferenceDate(p)}
                </td>
                <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                  {renderActions?.(p)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
