const ROLE_STYLES = {
  super_admin: 'bg-slate-800 text-white border-slate-700',
  power_admin: 'bg-teal-100 text-teal-900 border-teal-200',
  admin: 'bg-slate-100 text-slate-700 border-slate-200',
  sector_lead: 'bg-green-100 text-green-800 border-green-200',
  regional_focal_point: 'bg-purple-100 text-purple-800 border-purple-200',
  party_a: 'bg-blue-100 text-blue-800 border-blue-200',
  party_b: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  investor: 'bg-red-100 text-red-800 border-red-200',
  focal_point: 'bg-amber-100 text-amber-800 border-amber-200',
}

export default function UserRoleBadge({ role, label }) {
  const key = (role || '').toLowerCase()
  const style = ROLE_STYLES[key] || ROLE_STYLES.admin
  const display = label || role || 'Unknown'

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${style}`}>
      {display}
    </span>
  )
}
