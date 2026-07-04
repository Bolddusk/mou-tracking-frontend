import ProposalStatusFilters from './ProposalStatusFilters'
import ConferenceReportActions from '../reports/ConferenceReportActions'

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
  conferenceKey,
  onConferenceChange,
  conferences = [],
  selectedConference,
  sector,
  onSectorChange,
  mouLifecycle,
  onMouLifecycleChange,
  cooperationMode,
  onCooperationModeChange,
  cooperationModeFilters = [],
  sifcCategory,
  onSifcCategoryChange,
  sifcCategories = [],
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  sectors = [],
  mouLifecycleStatuses = [],
  onClearAll,
  hasActiveFilters = false,
  hideSectorFilter = false,
  onReportError,
}) {
  return (
    <div className="border-b border-slate-100 bg-green-50/40 px-4 py-4 sm:px-6">
      {conferences.length > 0 && (
        <div className="mb-4 border-b border-green-100 pb-4">
          <FilterSelect
            label="Conference"
            value={conferenceKey}
            onChange={onConferenceChange}
            className="max-w-full lg:max-w-2xl"
          >
            <option value="">All conferences</option>
            {conferences.map((c) => (
              <option key={c.key} value={c.key} title={c.name}>
                {c.name}
                {c.proposal_count != null ? ` (${c.proposal_count})` : ''}
              </option>
            ))}
          </FilterSelect>
          {selectedConference?.supports_report && (
            <ConferenceReportActions
              conferenceKey={selectedConference.key}
              conferenceName={selectedConference.name}
              onError={onReportError}
            />
          )}
          {selectedConference && (
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              {selectedConference.mou_count != null && (
                <span className="rounded-full bg-green-100 px-2.5 py-0.5 font-semibold text-green-800 ring-1 ring-green-200">
                  {selectedConference.mou_count} MoU
                </span>
              )}
              {selectedConference.jv_count != null && (
                <span className="rounded-full bg-blue-100 px-2.5 py-0.5 font-semibold text-blue-800 ring-1 ring-blue-200">
                  {selectedConference.jv_count} JV
                </span>
              )}
              {selectedConference.agreement_count != null && (
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 font-semibold text-amber-900 ring-1 ring-amber-200">
                  {selectedConference.agreement_count} Agreement
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {cooperationModeFilters.length > 0 && (
        <div className="mb-4 border-b border-green-100 pb-4">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Cooperation mode
          </p>
          <ProposalStatusFilters
            filters={cooperationModeFilters}
            value={cooperationMode}
            onChange={onCooperationModeChange}
          />
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        {!hideSectorFilter && (
          <FilterSelect label="Sector" value={sector} onChange={onSectorChange}>
            <option value="">All sectors</option>
            {sectors.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </FilterSelect>
        )}

        <FilterSelect label="MOU Status" value={mouLifecycle} onChange={onMouLifecycleChange}>
          <option value="">All</option>
          {mouLifecycleStatuses.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </FilterSelect>

        {sifcCategories.length > 0 && (
          <FilterSelect label="SIFC Category" value={sifcCategory} onChange={onSifcCategoryChange}>
            <option value="">All categories</option>
            {sifcCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </FilterSelect>
        )}

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
