import DocLink from '../DocLink'
import LoadingSpinner from '../LoadingSpinner'
import MouLifecycleBadge from './MouLifecycleBadge'
import PokeStatusBadge from '../PokeStatusBadge'
import StatusBadge from '../StatusBadge'
import { Link } from 'react-router-dom'
import { getProposalDisplayTitle } from '../../constants/proposalTemplate'
import { COOPERATION_MODE_LABELS } from '../../constants/proposalFilters'
import { formatDate } from '../../utils/format'
import { formatProposalConferenceDate, getProposalSifcCategory } from '../../utils/mouConferenceFields'
import { getChineseCompanyDisplay, getPakistaniCompanyDisplay } from '../../utils/proposalDisplay'

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
  showCooperationMode = false,
  showMouLifecycle = false,
  showDocumentLinks = true,
  showWorkflowStatus = true,
  useConferenceDate = false,
  showTitle = false,
  showSifcCategory = false,
  showArchiveStatus = false,
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
            {showTitle && <th className="px-4 py-3 font-semibold">Title</th>}
            <th className="px-4 py-3 font-semibold">Pakistani Company</th>
            <th className="px-4 py-3 font-semibold">Chinese Company</th>
            <th className="px-4 py-3 font-semibold">Sector</th>
            {showSifcCategory && (
              <th className="px-4 py-3 font-semibold">SIFC Category</th>
            )}
            {showCooperationMode && (
              <th className="px-4 py-3 font-semibold">Mode</th>
            )}
            {showDocumentLinks && (
              <>
                <th className="px-4 py-3 font-semibold">Pitch</th>
                <th className="px-4 py-3 font-semibold">MOU</th>
              </>
            )}
            {showMouLifecycle && (
              <th className="px-4 py-3 font-semibold">MOU Status</th>
            )}
            {showArchiveStatus && (
              <th className="px-4 py-3 font-semibold">Archive</th>
            )}
            {showWorkflowStatus && (
              <th className="px-4 py-3 font-semibold">Status</th>
            )}
            <th className="px-4 py-3 font-semibold">Request for Update</th>
            <th className="px-4 py-3 font-semibold">
              {useConferenceDate ? 'Conference Dates' : 'Date'}
            </th>
            <th className="px-4 py-3 font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {proposals.map((p) => {
            const title = getProposalDisplayTitle(p)
            const extraRowClass = rowClassName?.(p) || ''
            const archived = p.is_archived === true
            return (
              <tr
                key={p.id}
                className={`hover:bg-slate-50/80 ${archived ? 'bg-slate-50/60' : ''} ${extraRowClass}`}
              >
                {showTitle && (
                  <td className="max-w-[160px] truncate px-4 py-3 font-medium text-slate-800">
                    {title}
                  </td>
                )}
                <td
                  className="max-w-[140px] truncate px-4 py-3 text-slate-600"
                  title={getPakistaniCompanyDisplay(p)}
                >
                  <Link
                    to={`/proposals/${p.id}`}
                    className="font-medium text-slate-700 hover:text-portal-primary hover:underline"
                  >
                    {getPakistaniCompanyDisplay(p)}
                  </Link>
                </td>
                <td
                  className="max-w-[140px] truncate px-4 py-3 text-slate-600"
                  title={getChineseCompanyDisplay(p)}
                >
                  {getChineseCompanyDisplay(p)}
                </td>
                <td className="px-4 py-3 text-slate-600">{p.sector || '—'}</td>
                {showSifcCategory && (
                  <td
                    className="max-w-[160px] truncate px-4 py-3 text-slate-600"
                    title={getProposalSifcCategory(p)}
                  >
                    {getProposalSifcCategory(p)}
                  </td>
                )}
                {showCooperationMode && (
                  <td className="px-4 py-3">
                    {p.cooperation_mode ? (
                      <span className="inline-flex rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-800 ring-1 ring-green-200">
                        {COOPERATION_MODE_LABELS[p.cooperation_mode] ||
                          p.cooperation_mode.replace(/_/g, ' ')}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                )}
                {showDocumentLinks && (
                  <>
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
                  </>
                )}
                {showMouLifecycle && (
                  <td className="px-4 py-3">
                    <MouLifecycleBadge
                      lifecycle={p.mou_lifecycle}
                      label={p.mou_lifecycle_label}
                    />
                  </td>
                )}
                {showArchiveStatus && (
                  <td className="px-4 py-3">
                    {archived ? (
                      <span className="inline-flex rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-300">
                        Archived
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                )}
                {showWorkflowStatus && (
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <StatusBadge status={p.status} />
                      {renderStatusExtra?.(p)}
                    </div>
                  </td>
                )}
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1">
                    <PokeStatusBadge pokeStatus={p.poke_status} />
                    {renderUpdateExtra?.(p)}
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {useConferenceDate
                    ? formatProposalConferenceDate(p)
                    : formatDate(p.submitted_at || p.created_at)}
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
