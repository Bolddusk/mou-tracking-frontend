import ProposalSearchInput from './ProposalSearchInput'
import ProposalStatusFilters from './ProposalStatusFilters'

export default function ProposalOpportunitiesToolbar({
  title = 'Opportunities',
  search,
  onSearchChange,
  statusFilters,
  statusValue,
  onStatusChange,
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-slate-100 px-4 py-4 sm:px-6">
      <h3 className="font-semibold text-slate-800">{title}</h3>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <ProposalSearchInput value={search} onChange={onSearchChange} />
        {statusFilters?.length ? (
          <ProposalStatusFilters
            filters={statusFilters}
            value={statusValue}
            onChange={onStatusChange}
          />
        ) : null}
      </div>
    </div>
  )
}
