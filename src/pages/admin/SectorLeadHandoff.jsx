import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import * as adminSlApi from '../../api/adminSectorLead'
import Alert from '../../components/Alert'
import LoadingSpinner from '../../components/LoadingSpinner'
import { formatDate, getErrorMessage } from '../../utils/format'

const TABS = [
  { key: 'orphans', label: 'Unassigned Cases' },
  { key: 'history', label: 'Past Transfers' },
]

export default function SectorLeadHandoff() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') === 'history' ? 'history' : 'orphans'

  const [orphans, setOrphans] = useState(null)
  const [history, setHistory] = useState(null)
  const [loadingOrphans, setLoadingOrphans] = useState(true)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [error, setError] = useState('')

  const loadOrphans = useCallback(async () => {
    setLoadingOrphans(true)
    setError('')
    try {
      const data = await adminSlApi.getSectorLeadOrphans()
      setOrphans(data)
    } catch (err) {
      setError(getErrorMessage(err))
      setOrphans(null)
    } finally {
      setLoadingOrphans(false)
    }
  }, [])

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true)
    setError('')
    try {
      const data = await adminSlApi.getSectorLeadReassignments()
      setHistory(data)
    } catch (err) {
      setError(getErrorMessage(err))
      setHistory(null)
    } finally {
      setLoadingHistory(false)
    }
  }, [])

  useEffect(() => {
    loadOrphans()
  }, [loadOrphans])

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory()
    }
  }, [activeTab, loadHistory])

  const setTab = (tab) => {
    setSearchParams(tab === 'orphans' ? {} : { tab })
    if (tab === 'history' && !history) loadHistory()
  }

  const orphanComplaintCount = orphans?.counts?.orphan_complaints ?? 0
  const orphanChinaCount = orphans?.counts?.orphan_china_proposals ?? 0
  const totalOrphans = orphanComplaintCount + orphanChinaCount

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">Sector Officer Change</h3>
          <p className="mt-1 text-sm text-slate-500">
            Cases without an assigned officer, and records of past officer transfers
          </p>
        </div>
        <Link
          to="/admin/settings/sector-officer/reassign"
          className="text-sm font-medium text-portal-primary hover:underline"
        >
          + Transfer to New Officer
        </Link>
      </div>

      <Alert type="error" message={error} onClose={() => setError('')} />

      {totalOrphans > 0 && activeTab !== 'orphans' && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <strong>{totalOrphans} unassigned case(s)</strong> need attention.{' '}
          <button
            type="button"
            onClick={() => setTab('orphans')}
            className="font-semibold underline"
          >
            View unassigned cases
          </button>
        </div>
      )}

      <div className="flex gap-1 border-b border-slate-200">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setTab(tab.key)}
            className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'border-b-2 border-portal-primary text-portal-primary'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
            {tab.key === 'orphans' && totalOrphans > 0 && (
              <span className="ml-2 inline-flex rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {totalOrphans}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'orphans' ? (
        <OrphansTab
          orphans={orphans}
          loading={loadingOrphans}
          totalOrphans={totalOrphans}
        />
      ) : (
        <HistoryTab history={history} loading={loadingHistory} />
      )}
    </div>
  )
}

function OrphansTab({ orphans, loading, totalOrphans }) {
  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!orphans) {
    return <p className="py-12 text-center text-slate-500">Unable to load unassigned cases.</p>
  }

  const complaints = orphans.orphan_complaints || []
  const china = orphans.orphan_china_proposals || []

  return (
    <div className="space-y-6">
      {totalOrphans > 0 ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-900">
          <p className="font-semibold">
            {totalOrphans} unassigned case(s) found — no valid sector officer is linked.
          </p>
          <p className="mt-1">
            Transfer these cases to a new officer before deleting users.{' '}
            <Link
              to="/admin/settings/sector-officer/reassign"
              className="font-semibold text-red-800 underline"
            >
              Transfer now →
            </Link>
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-4 text-sm text-green-800">
          All complaints and China proposals have a valid sector officer assigned.
        </div>
      )}

      <OrphanTable
        title="Unassigned Complaints"
        emptyMessage="No unassigned complaints."
        rows={complaints}
        columns={[
          { key: 'id', label: 'ID', render: (r) => `#${r.id}` },
          { key: 'title', label: 'Title' },
          { key: 'status', label: 'Status' },
          {
            key: 'tagged_sector_lead',
            label: 'Tagged SL ID',
            render: (r) => r.tagged_sector_lead ?? '—',
          },
          {
            key: 'tagged_user_name',
            label: 'Tagged user',
            render: (r) => r.tagged_user_name || '(missing)',
          },
        ]}
      />

      <OrphanTable
        title="Unassigned China Proposals"
        emptyMessage="No unassigned China proposals."
        rows={china}
        columns={[
          { key: 'id', label: 'ID', render: (r) => `#${r.id}` },
          { key: 'title', label: 'Title', render: (r) => r.title || r.venture_name || '—' },
          { key: 'status', label: 'Status' },
          {
            key: 'forwarded_to_sl',
            label: 'Forwarded SL ID',
            render: (r) => r.forwarded_to_sl ?? '—',
          },
          {
            key: 'tagged_user_name',
            label: 'Tagged user',
            render: (r) => r.tagged_user_name || '(missing)',
          },
        ]}
      />
    </div>
  )
}

function OrphanTable({ title, emptyMessage, rows, columns }) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-3 sm:px-6">
        <h4 className="font-semibold text-slate-800">{title}</h4>
        <p className="text-xs text-slate-500">{rows.length} record(s)</p>
      </div>
      {rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-400">{emptyMessage}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-[640px] w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                {columns.map((col) => (
                  <th key={col.key} className="px-4 py-3 font-semibold">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-red-50/30">
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3 text-slate-700">
                      {col.render ? col.render(row) : row[col.key] || '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function HistoryTab({ history, loading }) {
  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const rows = history?.reassignments || []

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-3 sm:px-6">
        <h4 className="font-semibold text-slate-800">Officer Transfer History</h4>
        <p className="text-xs text-slate-500">{history?.count ?? rows.length} total</p>
      </div>
      {rows.length === 0 ? (
        <p className="py-12 text-center text-sm text-slate-400">No officer transfers recorded yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-[900px] w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">From</th>
                <th className="px-4 py-3 font-semibold">To</th>
                <th className="px-4 py-3 font-semibold">Sector</th>
                <th className="px-4 py-3 font-semibold">Reason</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{r.from_user_name}</p>
                    <p className="text-xs text-slate-500">{r.from_user_email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{r.to_user_name}</p>
                    <p className="text-xs text-slate-500">{r.to_user_email}</p>
                  </td>
                  <td className="max-w-[180px] px-4 py-3 text-slate-600">{r.sector}</td>
                  <td className="max-w-[200px] px-4 py-3 text-slate-600">
                    {r.reason || '—'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                    {formatDate(r.reassigned_at)}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{r.reassigned_by_name || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
