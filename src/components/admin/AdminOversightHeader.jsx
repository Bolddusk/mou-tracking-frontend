import { Link } from 'react-router-dom'
import { ADMIN_MM } from '../../constants/adminRoutes'

const ADMIN_TABS = [
  { key: 'myProposals', label: 'All Proposals', to: ADMIN_MM.myProposals },
  { key: 'focalPoint', label: 'Review Queue', to: ADMIN_MM.focalPoint },
  { key: 'forwarded', label: 'Forwarded', to: ADMIN_MM.forwarded },
  { key: 'board', label: 'Matching Board', to: ADMIN_MM.board },
  { key: 'matches', label: 'All Matches', to: ADMIN_MM.matches },
]

export default function AdminOversightHeader({ title, subtitle, activeTab }) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-green-700/20 bg-gradient-to-r from-green-800 to-green-700 p-5 text-white">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-green-100 ring-1 ring-white/25">
            Super Admin
          </span>
          <p className="text-xs font-semibold uppercase tracking-widest text-green-100/90">
            Matchmaking Oversight
          </p>
        </div>
        <h3 className="mt-2 text-lg font-semibold">{title}</h3>
        {subtitle && <p className="mt-1 text-sm text-green-50/90">{subtitle}</p>}
        {activeTab === 'myProposals' && (
          <p className="mt-3 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-green-50">
            Super Admin can create matchmaking proposals on behalf of any user — use{' '}
            <strong>New Proposal</strong> and select the owner. Direct MOUS uses{' '}
            <strong>MOUS → Add MOUS</strong>.
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        {ADMIN_TABS.map((tab) =>
          activeTab === tab.key ? (
            <span
              key={tab.key}
              className="rounded-lg bg-green-800 px-3 py-1.5 font-semibold text-white"
            >
              {tab.label}
            </span>
          ) : (
            <Link
              key={tab.key}
              to={tab.to}
              className="rounded-lg border border-green-200 bg-white px-3 py-1.5 font-medium text-green-800 hover:bg-green-50"
            >
              {tab.label}
            </Link>
          ),
        )}
      </div>
    </div>
  )
}
