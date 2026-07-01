import { getPaginationRange, PAGE_SIZE_OPTIONS } from '../../constants/proposalFilters'

export default function ProposalOpportunitiesPagination({
  pagination,
  limit,
  onLimitChange,
  onPrev,
  onNext,
  loading = false,
}) {
  if (!pagination) return null

  const { start, end, total } = getPaginationRange(pagination)
  const { page = 1, total_pages = 1, has_prev: hasPrev, has_next: hasNext } = pagination

  return (
    <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <p className="text-sm text-slate-600">
        {total === 0 ? (
          'No results'
        ) : (
          <>
            Showing <span className="font-semibold text-slate-800">{start}–{end}</span> of{' '}
            <span className="font-semibold text-slate-800">{total}</span>
          </>
        )}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Per page
          </span>
          <select
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            disabled={loading}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-800 outline-none focus:border-portal-primary focus:ring-2 focus:ring-portal-primary/30 disabled:opacity-60"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onPrev}
            disabled={!hasPrev || loading}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            ← Prev
          </button>
          <span className="min-w-[5.5rem] text-center text-sm text-slate-600">
            Page {page} of {total_pages}
          </span>
          <button
            type="button"
            onClick={onNext}
            disabled={!hasNext || loading}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  )
}
