import { SECTORS } from '../../constants/sectors'

export default function SectorFilterSelect({ value, onChange, className = '' }) {
  return (
    <div className={className}>
      <label className="mb-1 block text-xs font-medium text-slate-600">Sector filter</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-w-[12rem] rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-500/20"
      >
        <option value="">All sectors</option>
        {SECTORS.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </div>
  )
}
