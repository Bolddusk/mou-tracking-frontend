export default function ProposalSearchInput({ value, onChange, className = '' }) {
  return (
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Search title, party name, sector…"
      className={`w-full min-w-0 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-portal-primary focus:ring-2 focus:ring-portal-primary/30 sm:min-w-[240px] sm:max-w-xs ${className}`}
    />
  )
}
