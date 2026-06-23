import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as complianceApi from '../../api/complianceFilings'
import Alert from '../../components/Alert'
import LoadingSpinner from '../../components/LoadingSpinner'
import StatCard from '../../components/StatCard'
import { getErrorMessage } from '../../utils/format'

function ProgressBadge({ uploaded, required, complete }) {
  if (complete) {
    return (
      <span className="inline-flex rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">
        Complete ({uploaded}/{required})
      </span>
    )
  }
  return (
    <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
      {uploaded}/{required}
    </span>
  )
}

export default function ComplianceFilingsOverview() {
  const [overview, setOverview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await complianceApi.getComplianceOverview()
      setOverview(data)
    } catch (err) {
      setError(getErrorMessage(err))
      setOverview(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const orgs = overview?.organizations || []
  const years = overview?.required_fiscal_years || []

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-800">Compliance Filings</h3>
        <p className="mt-1 text-sm text-slate-500">
          Audit reports and annual returns for Party A organizations — last{' '}
          {years.length || 3} calendar years
          {years.length > 0 && ` (${years.join(', ')})`}
        </p>
      </div>

      <Alert type="error" message={error} onClose={() => setError('')} />

      {loading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner size="lg" />
        </div>
      ) : overview ? (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              label="Organizations"
              value={overview.total_organizations ?? orgs.length}
              color="blue"
              icon={
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
              }
            />
            <StatCard
              label="Complete"
              value={overview.complete_organizations ?? 0}
              color="green"
              icon={
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              }
            />
            <StatCard
              label="Incomplete"
              value={overview.incomplete_organizations ?? 0}
              color="orange"
              icon={
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              }
            />
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-[720px] w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Organization</th>
                    <th className="px-4 py-3 font-semibold">Email</th>
                    <th className="px-4 py-3 font-semibold">Country</th>
                    <th className="px-4 py-3 font-semibold">Progress</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orgs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                        No Party A organizations found.
                      </td>
                    </tr>
                  ) : (
                    orgs.map((org) => (
                      <tr key={org.user_id} className="hover:bg-slate-50/80">
                        <td className="px-4 py-3 font-medium text-slate-800">
                          {org.organization || org.full_name || '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{org.email || '—'}</td>
                        <td className="px-4 py-3 text-slate-600">{org.country || '—'}</td>
                        <td className="px-4 py-3">
                          <ProgressBadge
                            uploaded={org.uploaded_count ?? 0}
                            required={org.required_slots ?? 6}
                            complete={org.complete}
                          />
                        </td>
                        <td className="px-4 py-3">
                          {org.complete ? (
                            <span className="text-xs font-medium text-green-700">Complete</span>
                          ) : (
                            <span className="text-xs font-medium text-amber-700">
                              {org.missing_count ?? 0} missing
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            to={`/dashboard/super-admin/compliance/${org.user_id}`}
                            className="text-xs font-semibold text-green-800 hover:underline"
                          >
                            Manage filings
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
