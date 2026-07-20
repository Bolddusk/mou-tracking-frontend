import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import * as complaintsApi from '../../api/complaints'
import { ActionGroup, IconButton, ViewIcon } from '../../components/ActionIcons'
import Alert from '../../components/Alert'
import ComplaintStatusBadge from '../../components/ComplaintStatusBadge'
import LoadingSpinner from '../../components/LoadingSpinner'
import StatCard from '../../components/StatCard'
import { useAuth } from '../../context/AuthContext'
import {
  formatComplaintCategory,
  formatComplaintPriority,
  getComplaintMouTitle,
  priorityBadgeClass,
} from '../../utils/complaintDisplay'
import { formatDate, getErrorMessage } from '../../utils/format'

const EMPTY_SA_FILTERS = {
  status: '',
  sector_lead_id: '',
  filed_by: '',
  sector: '',
  priority: '',
  category: '',
  overdue: '',
  escalated: '',
  awaiting_sector_lead: '',
  q: '',
}

export default function ComplaintsList({ embedded = false }) {
  const navigate = useNavigate()
  const { isPartyA, isPartyB, isSectorLead, isSuperAdmin, isRegionalFocalPoint, dashboardPath } =
    useAuth()
  const isPartyMember = isPartyA || isPartyB

  useEffect(() => {
    if (embedded) return
    if (isSuperAdmin || isSectorLead) {
      navigate(`${dashboardPath}?view=complaints`, { replace: true })
    }
  }, [embedded, isSuperAdmin, isSectorLead, dashboardPath, navigate])

  const [complaints, setComplaints] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterOptions, setFilterOptions] = useState(null)
  const [stats, setStats] = useState(null)
  const [saFilters, setSaFilters] = useState(EMPTY_SA_FILTERS)
  const [searchInput, setSearchInput] = useState('')

  useEffect(() => {
    if (!isSuperAdmin) return
    let cancelled = false
    Promise.all([
      complaintsApi.getComplaintFilterOptions().catch(() => null),
      complaintsApi.getComplaintStats().catch(() => null),
    ]).then(([options, statsData]) => {
      if (cancelled) return
      setFilterOptions(options)
      setStats(statsData)
    })
    return () => {
      cancelled = true
    }
  }, [isSuperAdmin])

  useEffect(() => {
    if (!isSuperAdmin) return
    const timer = setTimeout(() => {
      setSaFilters((prev) => ({ ...prev, q: searchInput.trim() }))
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput, isSuperAdmin])

  const load = useCallback(async () => {
    if (!embedded && (isSuperAdmin || isSectorLead)) return
    setLoading(true)
    setError('')
    try {
      let result = { data: [], total: 0 }
      if (isPartyMember) result = await complaintsApi.getMyComplaints()
      else if (isSectorLead) result = await complaintsApi.getSectorComplaints()
      else if (isRegionalFocalPoint) result = await complaintsApi.getForwardedComplaints()
      else if (isSuperAdmin) result = await complaintsApi.getAllComplaints(saFilters)
      setComplaints(result.data || [])
      setTotal(result.total ?? result.data?.length ?? 0)
    } catch (err) {
      setError(getErrorMessage(err))
      setComplaints([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [embedded, isPartyMember, isSectorLead, isRegionalFocalPoint, isSuperAdmin, saFilters])

  useEffect(() => {
    load()
  }, [load])

  const setSaFilter = (key, value) => {
    setSaFilters((prev) => ({ ...prev, [key]: value }))
  }

  const clearSaFilters = () => {
    setSearchInput('')
    setSaFilters(EMPTY_SA_FILTERS)
  }

  const hasSaFilters = useMemo(
    () => Object.values(saFilters).some((v) => String(v || '').trim()),
    [saFilters],
  )

  const title = isPartyMember
    ? 'My Complaints'
    : isSectorLead
      ? 'Complaints Inbox'
      : isRegionalFocalPoint
        ? 'Forwarded Complaints'
        : 'All Complaints'

  const subtitle = isPartyB
    ? 'Grievances filed on proposals you are linked to'
    : isPartyA
      ? 'Grievances filed against your proposals'
      : isSectorLead
        ? 'Complaints tagged to you for review'
        : isRegionalFocalPoint
          ? 'Complaints escalated from sector leads'
          : 'Every complaint in the system'

  if (!embedded && (isSuperAdmin || isSectorLead)) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className={embedded ? 'space-y-4' : 'space-y-6'}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className={`font-semibold text-slate-800 ${embedded ? 'text-base' : 'text-lg'}`}>
            {title}
          </h3>
          <p className="text-sm text-slate-500">{subtitle}</p>
        </div>
        {isPartyMember && (
          <Link
            to="/complaints/new"
            className="inline-flex items-center justify-center rounded-lg bg-portal-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-portal-primary-hover"
          >
            File Complaint
          </Link>
        )}
      </div>

      <Alert type="error" message={error} onClose={() => setError('')} />

      {isSuperAdmin && stats && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4">
          <StatCard color="teal" label="Total" value={stats.total ?? 0} icon={<span>#</span>} />
          <StatCard color="blue" label="Open" value={stats.open ?? 0} icon={<span>○</span>} />
          <StatCard
            color="yellow"
            label="Under Review"
            value={stats.under_review ?? 0}
            icon={<span>…</span>}
          />
          <StatCard
            color="orange"
            label="Escalated"
            value={stats.escalated ?? 0}
            icon={<span>↑</span>}
          />
          <StatCard
            color="green"
            label="Resolved"
            value={stats.resolved ?? 0}
            icon={<span>✓</span>}
          />
          <StatCard color="red" label="Rejected" value={stats.rejected ?? 0} icon={<span>✕</span>} />
          <StatCard
            color="red"
            label="Overdue"
            value={stats.overdue ?? 0}
            icon={<span>!</span>}
            footer={stats.sla_days ? `SLA ${stats.sla_days} days` : undefined}
          />
          <StatCard
            color="yellow"
            label="Awaiting SL"
            value={stats.awaiting_sector_lead ?? 0}
            icon={<span>?</span>}
          />
        </div>
      )}

      {isSuperAdmin && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="flex min-w-0 flex-col gap-1 sm:col-span-2">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Search
              </span>
              <input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Title, company, party, sector lead…"
                className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm outline-none focus:border-portal-primary focus:ring-2 focus:ring-portal-primary/30"
              />
            </label>
            <FilterSelect
              label="Status"
              value={saFilters.status}
              onChange={(v) => setSaFilter('status', v)}
            >
              <option value="">All statuses</option>
              {(filterOptions?.statuses || []).map((s) => (
                <option key={s.value || s} value={s.value || s}>
                  {s.label || s.value || s}
                </option>
              ))}
            </FilterSelect>
            <FilterSelect
              label="Priority"
              value={saFilters.priority}
              onChange={(v) => setSaFilter('priority', v)}
            >
              <option value="">All priorities</option>
              {(filterOptions?.priorities || ['low', 'normal', 'high']).map((p) => {
                const value = p.value || p
                return (
                  <option key={value} value={value}>
                    {p.label || formatComplaintPriority(value)}
                  </option>
                )
              })}
            </FilterSelect>
            <FilterSelect
              label="Sector Lead"
              value={saFilters.sector_lead_id}
              onChange={(v) => setSaFilter('sector_lead_id', v)}
            >
              <option value="">All sector leads</option>
              {(filterOptions?.sector_leads || []).map((lead) => (
                <option key={lead.id} value={lead.id}>
                  {lead.full_name}
                </option>
              ))}
            </FilterSelect>
            <FilterSelect
              label="Filed by"
              value={saFilters.filed_by}
              onChange={(v) => setSaFilter('filed_by', v)}
            >
              <option value="">All parties</option>
              {(filterOptions?.parties || []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name}
                  {p.organization ? ` (${p.organization})` : ''}
                </option>
              ))}
            </FilterSelect>
            <FilterSelect
              label="Sector"
              value={saFilters.sector}
              onChange={(v) => setSaFilter('sector', v)}
            >
              <option value="">All sectors</option>
              {(filterOptions?.sectors || []).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </FilterSelect>
            <FilterSelect
              label="Category"
              value={saFilters.category}
              onChange={(v) => setSaFilter('category', v)}
            >
              <option value="">All categories</option>
              {(
                filterOptions?.categories || [
                  'delay',
                  'documentation',
                  'communication',
                  'misconduct',
                  'other',
                ]
              ).map((c) => {
                const value = c.value || c
                return (
                  <option key={value} value={value}>
                    {c.label || formatComplaintCategory(value)}
                  </option>
                )
              })}
            </FilterSelect>
            <FilterSelect
              label="Overdue"
              value={saFilters.overdue}
              onChange={(v) => setSaFilter('overdue', v)}
            >
              <option value="">Any</option>
              <option value="1">Overdue only</option>
            </FilterSelect>
            <FilterSelect
              label="Escalated"
              value={saFilters.escalated}
              onChange={(v) => setSaFilter('escalated', v)}
            >
              <option value="">Any</option>
              <option value="1">Escalated only</option>
            </FilterSelect>
            <FilterSelect
              label="Awaiting SL"
              value={saFilters.awaiting_sector_lead}
              onChange={(v) => setSaFilter('awaiting_sector_lead', v)}
            >
              <option value="">Any</option>
              <option value="1">Awaiting sector lead</option>
            </FilterSelect>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-slate-500">
              {loading ? 'Loading…' : `${total} complaint${total === 1 ? '' : 's'}`}
            </p>
            {hasSaFilters && (
              <button
                type="button"
                onClick={clearSaFilters}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner size="lg" />
          </div>
        ) : complaints.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-slate-500">No complaints yet.</p>
            {isPartyMember && (
              <Link
                to="/complaints/new"
                className="mt-2 inline-block text-sm font-medium text-green-600 hover:underline"
              >
                File your first complaint
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[960px] w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">ID</th>
                  <th className="px-4 py-3 font-semibold">Title</th>
                  <th className="px-4 py-3 font-semibold">Proposal</th>
                  <th className="px-4 py-3 font-semibold">Sector</th>
                  {(isSectorLead || isSuperAdmin) && (
                    <th className="px-4 py-3 font-semibold">Filed By</th>
                  )}
                  {(isPartyMember || isSuperAdmin) && (
                    <th className="px-4 py-3 font-semibold">Sector Lead</th>
                  )}
                  <th className="px-4 py-3 font-semibold">Priority</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {complaints.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-medium text-slate-600">#{c.id}</td>
                    <td className="max-w-[180px] truncate px-4 py-3 font-medium text-slate-800">
                      <Link
                        to={`/complaints/${c.id}`}
                        className="hover:text-portal-primary hover:underline"
                      >
                        {c.title}
                      </Link>
                    </td>
                    <td className="max-w-[160px] truncate px-4 py-3 text-slate-600">
                      {getComplaintMouTitle(c)}
                    </td>
                    <td className="max-w-[140px] truncate px-4 py-3 text-slate-600">
                      {c.proposal_sector || c.sector || '—'}
                    </td>
                    {(isSectorLead || isSuperAdmin) && (
                      <td className="px-4 py-3 text-slate-600">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span>{c.filed_by_name || '—'}</span>
                          <FiledByRoleBadge role={c.filed_by_role} />
                        </div>
                      </td>
                    )}
                    {(isPartyMember || isSuperAdmin) && (
                      <td className="px-4 py-3 text-slate-600">
                        {c.tagged_sector_lead_name || '—'}
                        {Number(c.awaiting_sector_lead) === 1 && (
                          <span className="ml-1 inline-flex rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 ring-1 ring-amber-200">
                            Awaiting SL
                          </span>
                        )}
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${priorityBadgeClass(c.priority)}`}
                      >
                        {formatComplaintPriority(c.priority || 'normal')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <ComplaintStatusBadge status={c.status} />
                        {c.is_overdue && (
                          <span className="inline-flex rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-800 ring-1 ring-red-200">
                            Overdue
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(c.created_at)}</td>
                    <td className="px-4 py-3">
                      <ActionGroup>
                        <IconButton
                          variant="view"
                          title="View complaint"
                          to={`/complaints/${c.id}`}
                        >
                          <ViewIcon />
                        </IconButton>
                      </ActionGroup>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function FilterSelect({ label, value, onChange, children }) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
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

function FiledByRoleBadge({ role }) {
  const normalized = String(role || '').toLowerCase()
  if (normalized !== 'party_a' && normalized !== 'party_b') return null
  const isA = normalized === 'party_a'
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${
        isA
          ? 'bg-emerald-50 text-emerald-800 ring-emerald-200'
          : 'bg-sky-50 text-sky-800 ring-sky-200'
      }`}
    >
      {isA ? 'Party A' : 'Party B'}
    </span>
  )
}
