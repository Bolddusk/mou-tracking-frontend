import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import * as complaintsApi from '../../api/complaints'
import { ActionGroup, IconButton, ViewIcon } from '../../components/ActionIcons'
import Alert from '../../components/Alert'
import ComplaintStatusBadge from '../../components/ComplaintStatusBadge'
import LoadingSpinner from '../../components/LoadingSpinner'
import { getProposalDisplayTitle } from '../../constants/proposalTemplate'
import { useAuth } from '../../context/AuthContext'
import { formatDate, getErrorMessage } from '../../utils/format'

export default function ComplaintsList() {
  const navigate = useNavigate()
  const { isPartyA, isPartyB, isSectorLead, isSuperAdmin, isRegionalFocalPoint } = useAuth()
  const isPartyMember = isPartyA || isPartyB

  const [complaints, setComplaints] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      let data = []
      if (isPartyMember) data = await complaintsApi.getMyComplaints()
      else if (isSectorLead) data = await complaintsApi.getSectorComplaints()
      else if (isRegionalFocalPoint) data = await complaintsApi.getForwardedComplaints()
      else if (isSuperAdmin) data = await complaintsApi.getAllComplaints()
      setComplaints(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [isPartyMember, isSectorLead, isRegionalFocalPoint, isSuperAdmin])

  useEffect(() => {
    load()
  }, [load])

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
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
            <table className="min-w-[900px] w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">ID</th>
                  <th className="px-4 py-3 font-semibold">Title</th>
                  <th className="px-4 py-3 font-semibold">Proposal</th>
                  {(isSectorLead || isSuperAdmin) && (
                    <th className="px-4 py-3 font-semibold">Filed By</th>
                  )}
                  {(isPartyA || isSuperAdmin) && (
                    <th className="px-4 py-3 font-semibold">Sector Lead</th>
                  )}
                  {isSectorLead && (
                    <th className="px-4 py-3 font-semibold">Returned</th>
                  )}
                  {(isRegionalFocalPoint || isSuperAdmin) && (
                    <th className="px-4 py-3 font-semibold">Forwarded To</th>
                  )}
                  {isRegionalFocalPoint && (
                    <th className="px-4 py-3 font-semibold">Party B</th>
                  )}
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {complaints.map((c) => (
                  <tr
                    key={c.id}
                    className={
                      c.status === 'returned_to_sector_lead' && isSectorLead
                        ? 'bg-orange-50/70 hover:bg-orange-50'
                        : c.status === 'forwarded' && isRegionalFocalPoint
                          ? 'bg-purple-50/50 hover:bg-purple-50'
                          : 'hover:bg-slate-50/80'
                    }
                  >
                    <td className="px-4 py-3 font-medium text-slate-600">#{c.id}</td>
                    <td className="max-w-[180px] truncate px-4 py-3 font-medium text-slate-800">
                      {c.title}
                    </td>
                    <td className="max-w-[140px] truncate px-4 py-3 text-slate-600">
                      {getProposalDisplayTitle(c)}
                    </td>
                    {(isSectorLead || isSuperAdmin) && (
                      <td className="px-4 py-3 text-slate-600">{c.filed_by_name || '—'}</td>
                    )}
                    {(isPartyMember || isSuperAdmin) && (
                      <td className="px-4 py-3 text-slate-600">
                        {c.tagged_sector_lead_name || '—'}
                      </td>
                    )}
                    {isSectorLead && (
                      <td className="px-4 py-3 text-slate-600">
                        {c.returned_at ? formatDate(c.returned_at) : '—'}
                      </td>
                    )}
                    {(isRegionalFocalPoint || isSuperAdmin) && (
                      <td className="px-4 py-3 text-slate-600">
                        {c.forwarded_to_name || '—'}
                      </td>
                    )}
                    {isRegionalFocalPoint && (
                      <td className="px-4 py-3">
                        {c.party_b_engagement?.tagged ? (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
                            Tagged
                          </span>
                        ) : c.party_b_engagement?.can_tag_party_b ? (
                          <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-900">
                            Tag needed
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <ComplaintStatusBadge status={c.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(c.created_at)}</td>
                    <td className="px-4 py-3">
                      <ActionGroup>
                        <IconButton
                          variant="view"
                          title="View complaint"
                          onClick={() => navigate(`/complaints/${c.id}`)}
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
