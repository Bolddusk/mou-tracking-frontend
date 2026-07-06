import {
  hasActiveChangeLogFilters,
  normalizeFilterOptionList,
} from '../../utils/changeLogFilters'

function FilterSelect({ label, value, onChange, children, className = '' }) {
  return (
    <label className={`flex min-w-0 flex-col gap-1 ${className}`}>
      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</span>
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

function FilterSearch({ label, value, onChange, placeholder }) {
  return (
    <label className="flex min-w-0 flex-col gap-1 sm:min-w-[200px] sm:flex-1 lg:max-w-xs">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-800 outline-none focus:border-portal-primary focus:ring-2 focus:ring-portal-primary/30"
      />
    </label>
  )
}

function FilterDate({ label, value, onChange }) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-800 outline-none focus:border-portal-primary focus:ring-2 focus:ring-portal-primary/30"
      />
    </label>
  )
}

function OptionList({ items, allLabel }) {
  const normalized = normalizeFilterOptionList(items)
  return (
    <>
      <option value="">{allLabel}</option>
      {normalized.map((item) => (
        <option key={item.value} value={item.value}>
          {item.label}
        </option>
      ))}
    </>
  )
}

function sectorLeadLabel(sl) {
  return sl.full_name || sl.name || sl.email || `User #${sl.id}`
}

export default function ChangeLogsFilterBar({
  variant = 'admin',
  filters,
  onChange,
  filterOptions,
  onClear,
  onPreview,
  onDownload,
  previewLoading = false,
  downloadLoading = false,
}) {
  const set = (key, value) => onChange({ ...filters, [key]: value })

  const sectors =
    variant === 'sector'
      ? filterOptions?.scoped_sectors?.length
        ? filterOptions.scoped_sectors
        : filterOptions?.sectors || []
      : filterOptions?.sectors || []

  const mouStatuses = filterOptions?.mou_statuses || []
  const sectorLeads = filterOptions?.sector_leads || []
  const changedByRoles = filterOptions?.changed_by_roles || []

  const active = hasActiveChangeLogFilters(filters, variant)

  return (
    <div className="border-b border-slate-100 bg-green-50/40 px-4 py-4 sm:px-6">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">
            {variant === 'admin' ? 'Recent Changes' : 'Sector Change History'}
          </h2>
          <p className="text-sm text-slate-500">
            {variant === 'admin'
              ? 'Latest activity across all MOUs — search by company name or MOU ID'
              : 'Changes within your jurisdiction — toggle “Only my changes” for your edits'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
        {onPreview && (
          <button
            type="button"
            disabled={previewLoading || downloadLoading}
            onClick={onPreview}
            className="shrink-0 rounded-lg border border-portal-primary px-4 py-2 text-sm font-semibold text-portal-primary hover:bg-green-50 disabled:opacity-50"
          >
            {previewLoading ? 'Loading…' : 'Preview Report'}
          </button>
        )}
        {onDownload && (
          <button
            type="button"
            disabled={downloadLoading || previewLoading}
            onClick={onDownload}
            className="shrink-0 rounded-lg bg-portal-primary px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50"
          >
            {downloadLoading ? 'Preparing…' : 'Download Report'}
          </button>
        )}
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <FilterSearch
          label="Search"
          value={filters.q}
          onChange={(v) => set('q', v)}
          placeholder="Company, MOU ID, name…"
        />

        {variant === 'admin' && (
          <FilterSelect
            label="Sector Lead"
            value={filters.sector_lead_id}
            onChange={(v) => set('sector_lead_id', v)}
            className="min-w-[160px] sm:min-w-[200px]"
          >
            <option value="">All sector leads</option>
            {sectorLeads.map((sl) => (
              <option key={sl.id} value={sl.id}>
                {sectorLeadLabel(sl)}
              </option>
            ))}
          </FilterSelect>
        )}

        <FilterSelect
          label="Sector"
          value={filters.sector}
          onChange={(v) => set('sector', v)}
          className="min-w-[160px] sm:min-w-[200px]"
        >
          <OptionList items={sectors} allLabel="All sectors" />
        </FilterSelect>

        {changedByRoles.length > 0 && (
          <FilterSelect
            label="Changed by role"
            value={filters.changed_by_role}
            onChange={(v) => set('changed_by_role', v)}
            className="min-w-[140px]"
          >
            <OptionList items={changedByRoles} allLabel="All roles" />
          </FilterSelect>
        )}

        <FilterSelect
          label="MOU Status"
          value={filters.mou_status}
          onChange={(v) => set('mou_status', v)}
          className="min-w-[130px]"
        >
          <OptionList items={mouStatuses} allLabel="All statuses" />
        </FilterSelect>

        <FilterDate label="From" value={filters.from} onChange={(v) => set('from', v)} />
        <FilterDate label="To" value={filters.to} onChange={(v) => set('to', v)} />

        {variant === 'sector' && (
          <label className="flex cursor-pointer items-center gap-2 pb-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={Boolean(filters.mine_only)}
              onChange={(e) => set('mine_only', e.target.checked)}
              className="rounded border-slate-300 text-portal-primary focus:ring-portal-primary/30"
            />
            Only my changes
          </label>
        )}

        {active && (
          <button
            type="button"
            onClick={onClear}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  )
}
