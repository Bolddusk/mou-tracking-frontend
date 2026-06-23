import DocLink from '../DocLink'
import LoadingSpinner from '../LoadingSpinner'
import PokeStatusBadge from '../PokeStatusBadge'
import StatusBadge from '../StatusBadge'
import { getProposalDisplayTitle } from '../../constants/proposalTemplate'
import { formatDate } from '../../utils/format'
import { getPartyADisplay, getPartyBDisplay } from '../../utils/proposalDisplay'

export default function ProposalOpportunitiesTable({
  proposals,
  loading,
  emptyMessage = 'No opportunities found.',
  onView,
  onOpenFile,
  renderActions,
  rowClassName,
  renderUpdateExtra,
  renderStatusExtra,
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
            <th className="px-4 py-3 font-semibold">Title</th>
            <th className="px-4 py-3 font-semibold">Party A</th>
            <th className="px-4 py-3 font-semibold">Party B</th>
            <th className="px-4 py-3 font-semibold">Sector</th>
            <th className="px-4 py-3 font-semibold">Pitch</th>
            <th className="px-4 py-3 font-semibold">MOU</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 font-semibold">Request for Update</th>
            <th className="px-4 py-3 font-semibold">Date</th>
            <th className="px-4 py-3 font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {proposals.map((p) => {
            const title = getProposalDisplayTitle(p)
            const extraRowClass = rowClassName?.(p) || ''
            return (
              <tr key={p.id} className={`hover:bg-slate-50/80 ${extraRowClass}`}>
                <td className="max-w-[160px] truncate px-4 py-3 font-medium text-slate-800">
                  {title}
                </td>
                <td className="max-w-[140px] truncate px-4 py-3 text-slate-600" title={getPartyADisplay(p)}>
                  {getPartyADisplay(p)}
                </td>
                <td className="max-w-[140px] truncate px-4 py-3 text-slate-600" title={getPartyBDisplay(p)}>
                  {getPartyBDisplay(p)}
                </td>
                <td className="px-4 py-3 text-slate-600">{p.sector || '—'}</td>
                <td className="px-4 py-3">
                  <DocLink
                    url={p.proposal_file_url}
                    title="View pitch deck"
                    onOpen={(url) => onOpenFile?.(url, `Pitch Deck — ${title}`)}
                  />
                </td>
                <td className="px-4 py-3">
                  <DocLink
                    url={p.mou_file_url}
                    title="View MOU file"
                    onOpen={(url) => onOpenFile?.(url, `MOU — ${title}`)}
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <StatusBadge status={p.status} />
                    {renderStatusExtra?.(p)}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1">
                    <PokeStatusBadge pokeStatus={p.poke_status} />
                    {renderUpdateExtra?.(p)}
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {formatDate(p.submitted_at || p.created_at)}
                </td>
                <td className="px-4 py-3">{renderActions?.(p)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
