export default function ProposalStatusFilters({ filters, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {filters.map((f) => (
        <button
          key={f.key || 'all'}
          type="button"
          onClick={() => onChange(f.key)}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
            value === f.key
              ? 'bg-sidebar text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          {f.label}
        </button>
      ))}
    </div>
  )
}
