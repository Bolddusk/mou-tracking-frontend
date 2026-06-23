import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import * as complaintsApi from '../../api/complaints'
import * as proposalsApi from '../../api/proposals'
import { ActionGroup, IconButton, ViewIcon } from '../../components/ActionIcons'
import Alert from '../../components/Alert'
import FilePreviewModal from '../../components/FilePreviewModal'
import LoadingSpinner from '../../components/LoadingSpinner'
import ComplaintStatusBadge from '../../components/ComplaintStatusBadge'
import ProposalOpportunitiesTable from '../../components/proposals/ProposalOpportunitiesTable'
import StatCard from '../../components/StatCard'
import StatusBadge from '../../components/StatusBadge'
import { getProposalDisplayTitle } from '../../constants/proposalTemplate'
import { formatDate, getErrorMessage } from '../../utils/format'

export default function PartyBDashboard() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('proposals')
  const [proposals, setProposals] = useState([])
  const [complaints, setComplaints] = useState([])
  const [assigned, setAssigned] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filePreview, setFilePreview] = useState(null)
  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    const errors = []

    try {
      const propData = await proposalsApi.getMyProposals()
      setProposals(Array.isArray(propData) ? propData : [])
    } catch (err) {
      errors.push(getErrorMessage(err))
      setProposals([])
    }

    try {
      const compData = await complaintsApi.getMyComplaints()
      setComplaints(Array.isArray(compData) ? compData : [])
    } catch (err) {
      errors.push(`Complaints: ${getErrorMessage(err)}`)
      setComplaints([])
    }

    try {
      const assignedData = await complaintsApi.getPartyBAssignedComplaints()
      setAssigned(Array.isArray(assignedData) ? assignedData : [])
    } catch (err) {
      errors.push(`RF assignments: ${getErrorMessage(err)}`)
      setAssigned([])
    }

    if (errors.length) setError(errors.join(' · '))
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const stats = useMemo(() => {
    const counts = { total: proposals.length, approved: 0, submitted: 0, rejected: 0 }
    for (const p of proposals) {
      const s = (p.status || '').toLowerCase()
      if (s in counts) counts[s]++
    }
    return counts
  }, [proposals])

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-800">Party B Dashboard</h3>
        <p className="text-sm text-slate-500">
          Direct opportunities where you are invited as Party B. Matchmaking engagements after a
          match are linked to the China-side investor account (
          <code className="text-xs">investor@test.com</code>), not this Party B login.
        </p>
      </div>

      <Alert type="error" message={error} onClose={() => setError('')} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard color="teal" label="Proposals" value={stats.total} footer="Linked to you" icon={<span>Σ</span>} />
        <StatCard color="green" label="Approved" value={stats.approved} icon={<span>✓</span>} />
        <StatCard color="blue" label="Submitted" value={stats.submitted} icon={<span>⏳</span>} />
        <StatCard color="red" label="Rejected" value={stats.rejected} icon={<span>✕</span>} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200">
        <div className="flex gap-2">
          <TabButton active={tab === 'proposals'} onClick={() => setTab('proposals')}>
            My Proposals
          </TabButton>
          <TabButton active={tab === 'complaints'} onClick={() => setTab('complaints')}>
            My Complaints
          </TabButton>
          <TabButton active={tab === 'assigned'} onClick={() => setTab('assigned')}>
            RF Assignments
            {assigned.some((c) => c.party_b_engagement?.can_respond_to_poke) && (
              <span className="ml-1.5 rounded-full bg-orange-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                !
              </span>
            )}
          </TabButton>
        </div>
        {tab === 'complaints' && (
          <Link
            to="/complaints/new"
            className="mb-1 rounded-lg bg-portal-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-portal-primary-hover"
          >
            File Complaint
          </Link>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner size="lg" />
          </div>
        ) : tab === 'proposals' ? (
          <ProposalOpportunitiesTable
            proposals={proposals}
            loading={false}
            emptyMessage="No proposals linked yet. You will receive an email when a proposal is approved with your Party B details."
            onView={(id) => navigate(`/proposals/${id}`)}
            onOpenFile={(url, title) => setFilePreview({ url, title })}
            renderActions={(p) => (
              <ActionGroup>
                <IconButton
                  variant="view"
                  title="View proposal"
                  onClick={() => navigate(`/proposals/${p.id}`)}
                >
                  <ViewIcon />
                </IconButton>
              </ActionGroup>
            )}
          />
        ) : tab === 'assigned' ? (
          assigned.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-500">
              No regional assignments yet. When a Regional FP tags you on a forwarded complaint,
              it will appear here.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[700px] w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Title</th>
                    <th className="px-4 py-3 font-semibold">Proposal</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Tagged</th>
                    <th className="px-4 py-3 font-semibold">Poke</th>
                    <th className="px-4 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {assigned.map((c) => (
                    <tr
                      key={c.id}
                      className={
                        c.party_b_engagement?.can_respond_to_poke
                          ? 'bg-amber-50/60 hover:bg-amber-50'
                          : 'hover:bg-slate-50/80'
                      }
                    >
                      <td className="px-4 py-3 font-medium text-slate-800">{c.title}</td>
                      <td className="px-4 py-3 text-slate-600">{getProposalDisplayTitle(c)}</td>
                      <td className="px-4 py-3">
                        <ComplaintStatusBadge status={c.status} />
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {formatDate(c.party_b_engagement?.tagged_at)}
                      </td>
                      <td className="px-4 py-3">
                        {c.party_b_engagement?.can_respond_to_poke ? (
                          <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-900">
                            Respond
                          </span>
                        ) : c.party_b_engagement?.pending_poke_id ? (
                          <span className="text-xs text-slate-500">Pending</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <ActionGroup>
                          <IconButton
                            variant="view"
                            title="Open engagement"
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
          )
        ) : complaints.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-slate-500">No complaints filed yet.</p>
            <Link
              to="/complaints/new"
              className="mt-2 inline-block text-sm font-medium text-green-600 hover:underline"
            >
              File a complaint
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[700px] w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Title</th>
                  <th className="px-4 py-3 font-semibold">Proposal</th>
                  <th className="px-4 py-3 font-semibold">Sector Lead</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {complaints.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-medium text-slate-800">{c.title}</td>
                    <td className="px-4 py-3 text-slate-600">{getProposalDisplayTitle(c)}</td>
                    <td className="px-4 py-3 text-slate-600">{c.tagged_sector_lead_name || '—'}</td>
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

      <FilePreviewModal
        open={Boolean(filePreview)}
        title={filePreview?.title}
        fileUrl={filePreview?.url}
        onClose={() => setFilePreview(null)}
      />
    </div>
  )
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border-b-2 px-4 py-2 text-sm font-semibold transition-colors ${
        active
          ? 'border-portal-primary text-green-800'
          : 'border-transparent text-slate-500 hover:text-slate-700'
      }`}
    >
      {children}
    </button>
  )
}
