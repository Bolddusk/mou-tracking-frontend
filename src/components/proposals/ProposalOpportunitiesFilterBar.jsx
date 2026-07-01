import { MM_MOU_STATUS_LABELS } from '../../constants/matchmaking'
import { BOOL_FILTER_OPTIONS } from '../../constants/proposalFilters'

function FilterSelect({ label, value, onChange, children, className = '' }) {
  return (
    <label className={`flex min-w-0 flex-col gap-1 ${className}`}>
      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-800 outline-none focus:border-portal-primary focus:ring-2 focus:ring-portal-primary/30"
      >
        {children}
      </select>
    </label>
  )
}

function FilterDate({ label, value, onChange }) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-800 outline-none focus:border-portal-primary focus:ring-2 focus:ring-portal-primary/30"
      />
    </label>
  )
}

export default function ProposalOpportunitiesFilterBar({
  sector,
  onSectorChange,
  mouStatus,
  onMouStatusChange,
  hasMou,
  onHasMouChange,
  hasPitch,
  onHasPitchChange,
  dealClosed,
  onDealClosedChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  sectors = [],
  mouStatuses = [],
  onClearAll,
  hasActiveFilters = false,
}) {
  return (
    <div className="border-b border-slate-100 bg-green-50/40 px-4 py-4 sm:px-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        <FilterSelect label="Sector" value={sector} onChange={onSectorChange}>
          <option value="">All sectors</option>
          {sectors.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect label="MOU status" value={mouStatus} onChange={onMouStatusChange}>
          <option value="">All MOU statuses</option>
          {mouStatuses.map((s) => (
            <option key={s} value={s}>
              {MM_MOU_STATUS_LABELS[s] || s.replace(/_/g, ' ')}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect label="Has MOU" value={hasMou} onChange={onHasMouChange}>
          {BOOL_FILTER_OPTIONS.map((o) => (
            <option key={o.value || 'all'} value={o.value}>
              {o.label}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect label="Has pitch" value={hasPitch} onChange={onHasPitchChange}>
          {BOOL_FILTER_OPTIONS.map((o) => (
            <option key={o.value || 'all'} value={o.value}>
              {o.label}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect label="Deal closed" value={dealClosed} onChange={onDealClosedChange}>
          {BOOL_FILTER_OPTIONS.map((o) => (
            <option key={o.value || 'all'} value={o.value}>
              {o.label}
            </option>
          ))}
        </FilterSelect>

        <FilterDate label="From date" value={dateFrom} onChange={onDateFromChange} />
        <FilterDate label="To date" value={dateTo} onChange={onDateToChange} />
      </div>

      {hasActiveFilters && (
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={onClearAll}
            className="rounded-lg border border-green-700/30 bg-white px-3 py-1.5 text-sm font-medium text-green-800 hover:bg-green-50"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  )
}
