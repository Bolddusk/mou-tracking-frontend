import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import * as usersApi from '../../api/users'
import Alert from '../../components/Alert'
import LoadingSpinner from '../../components/LoadingSpinner'
import Modal from '../../components/Modal'
import PartyBCredentialsModal from '../../components/PartyBCredentialsModal'
import UserRoleBadge from '../../components/UserRoleBadge'
import { useAuth } from '../../context/AuthContext'
import { ROLES } from '../../constants/sectors'
import { useSectors } from '../../context/SectorsContext'
import { getPartyAProfilePaths, getPartyBProfilePaths } from '../../constants/profileRoutes'
import { formatDate, getErrorMessage } from '../../utils/format'
import {
  deleteOffersUnlink,
  formatReferencesSummary,
  formatStatsSummary,
  formatUnlinkedSummary,
  hasPortalRecords,
} from '../../utils/userStats'

const STAT_LABELS = {
  proposals_filed: 'Proposals filed',
  proposals_reviewed: 'Proposals reviewed',
  complaints_filed: 'Complaints filed',
  complaints_tagged: 'Complaints tagged',
  complaints_forwarded: 'Complaints forwarded',
  activities_added: 'Activities added',
}

export default function UserDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user: currentUser } = useAuth()
  const { sectors } = useSectors()

  const [user, setUser] = useState(null)
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [roleOpen, setRoleOpen] = useState(false)
  const [roleForm, setRoleForm] = useState({ role: '', sector: '' })
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ password: '', confirm: '' })
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteRefs, setDeleteRefs] = useState(null)
  const [deleteUnlinkMode, setDeleteUnlinkMode] = useState(false)
  const [deleteHint, setDeleteHint] = useState('')
  const [partyBCredentials, setPartyBCredentials] = useState(null)
  const [partyBCredentialsSubtitle, setPartyBCredentialsSubtitle] = useState('')
  const [slReassignBlock, setSlReassignBlock] = useState(null)

  const profilePaths = getPartyAProfilePaths(ROLES.SUPER_ADMIN)
  const partyBProfilePaths = getPartyBProfilePaths(ROLES.SUPER_ADMIN)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await usersApi.getUserById(id)
      setUser(data)
      setEditForm({
        full_name: data.full_name || '',
        email: data.email || '',
        organization: data.organization || '',
        phone: data.phone || '',
        sector: data.sector || '',
      })
      setRoleForm({ role: data.role || '', sector: data.sector || '' })
    } catch (err) {
      setError(getErrorMessage(err))
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    usersApi
      .getUserRoles()
      .then((r) => setRoles(usersApi.parseAssignableUserRoles(r)))
      .catch(() => {})
  }, [])

  const selectedRoleMeta = useMemo(
    () => roles.find((r) => r.value === roleForm.role),
    [roles, roleForm.role]
  )

  const roleNeedsSector = selectedRoleMeta?.requires_sector
  const userNeedsSector = user && user.role === 'sector_lead'
  const isSelf = Number(currentUser?.id) === Number(user?.id)
  const isPartyA = user?.role === 'party_a' || user?.role === ROLES.PARTY_A
  const isPartyB = user?.role === 'party_b' || user?.role === ROLES.PARTY_B
  const isPartyLoginRole = isPartyA || isPartyB
  const hasRecords = hasPortalRecords(user?.stats)
  const canDelete = user && !isSelf && (!hasRecords || isPartyB)
  const deleteWithUnlink = isPartyB || deleteUnlinkMode

  const handleUpdate = async () => {
    setActionLoading(true)
    setError('')
    try {
      await usersApi.updateUser(id, {
        full_name: editForm.full_name.trim(),
        email: editForm.email.trim(),
        organization: editForm.organization.trim() || undefined,
        phone: editForm.phone.trim() || undefined,
        sector: userNeedsSector ? editForm.sector.trim() : undefined,
      })
      setEditOpen(false)
      setSuccess('Profile updated')
      await load()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setActionLoading(false)
    }
  }

  const handleRoleChange = async () => {
    if (roleNeedsSector && !roleForm.sector.trim()) return
    setActionLoading(true)
    setError('')
    try {
      await usersApi.changeUserRole(
        id,
        roleForm.role,
        roleNeedsSector ? roleForm.sector.trim() : undefined
      )
      setRoleOpen(false)
      setSuccess('Role updated')
      await load()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setActionLoading(false)
    }
  }

  const handlePasswordReset = async () => {
    if (passwordForm.password.length < 6 || passwordForm.password !== passwordForm.confirm) return
    setActionLoading(true)
    setError('')
    try {
      await usersApi.resetUserPassword(id, passwordForm.password)
      setPasswordOpen(false)
      setPasswordForm({ password: '', confirm: '' })
      setSuccess(
        user?.email
          ? `Password reset for ${user.email}. Share the new password securely — the previous password cannot be recovered.`
          : 'Password reset successfully. Share the new password securely.',
      )
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setActionLoading(false)
    }
  }

  const handleIssueCredentials = async () => {
    setActionLoading(true)
    setError('')
    try {
      const res = await usersApi.issuePartyBCredentials(id)
      setPartyBCredentials(res.credentials)
      setPartyBCredentialsSubtitle(
        'New temporary password issued. Share securely — previous password no longer works.',
      )
      setSuccess(res.message || 'Credentials issued')
      await load()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async () => {
    setActionLoading(true)
    setError('')
    try {
      const res = await usersApi.deleteUser(id, {
        unlinkReferences: deleteWithUnlink,
      })
      setDeleteOpen(false)
      setDeleteRefs(null)
      setDeleteUnlinkMode(false)
      setDeleteHint('')
      const unlinkedSummary = formatUnlinkedSummary(res.unlinked)
      navigate('/admin/users', {
        state: {
          success:
            res.message ||
            (unlinkedSummary
              ? `User deleted — ${unlinkedSummary} unlinked`
              : 'User deleted'),
        },
      })
    } catch (err) {
      const data = err?.response?.data
      const refs = data?.references
      if (
        data?.open_complaints != null ||
        data?.open_china_proposals != null
      ) {
        setDeleteOpen(false)
        setSlReassignBlock({
          open_complaints: data.open_complaints ?? 0,
          open_china_proposals: data.open_china_proposals ?? 0,
          message: data.message || data.error,
          sector: user?.sector,
        })
        setError('')
      } else if (refs || deleteOffersUnlink(data)) {
        if (refs) setDeleteRefs(refs)
        if (deleteOffersUnlink(data)) {
          setDeleteUnlinkMode(true)
          setDeleteHint(data.hint || '')
          setError('')
        } else {
          setError(getErrorMessage(err))
        }
      } else {
        setDeleteOpen(false)
        setError(getErrorMessage(err))
      }
    } finally {
      setActionLoading(false)
    }
  }

  const openDeleteModal = () => {
    setDeleteRefs(null)
    setDeleteUnlinkMode(isPartyB)
    setDeleteHint('')
    setDeleteOpen(true)
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <p className="text-slate-600">User not found</p>
        <Link to="/admin/users" className="mt-4 inline-block text-sm text-green-600 hover:underline">
          ← Back to users
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-10">
      <Link to="/admin/users" className="text-sm font-medium text-green-600 hover:underline">
        ← Back to users
      </Link>

      <Alert type="error" message={error} onClose={() => setError('')} />
      <Alert type="success" message={success} onClose={() => setSuccess('')} />

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50/80 px-6 py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                User #{user.id}
              </p>
              <h1 className="mt-1 text-xl font-bold text-slate-800">{user.full_name}</h1>
              <p className="mt-1 text-sm text-slate-500">{user.email}</p>
            </div>
            <UserRoleBadge role={user.role} label={user.role_label} />
          </div>
        </div>

        <div className="grid gap-4 p-6 sm:grid-cols-2">
          <Info label="Sector" value={user.sector} />
          <Info label="Organization" value={user.organization} />
          <Info label="Phone" value={user.phone} />
          <Info label="Joined" value={formatDate(user.created_at)} />
        </div>

        {isPartyLoginRole && (
          <div className="border-t border-slate-100 px-6 py-4">
            <h2 className="text-sm font-semibold text-slate-800">
              {isPartyA ? 'Party A login' : isPartyB ? 'Party B login' : 'Portal login'}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Previous passwords cannot be shown again. Use the login email below; set a new
              password with Reset Password if Sector Lead missed generating credentials.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Login email
                </p>
                <code className="break-all text-sm font-medium text-slate-800">{user.email}</code>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (user.email) navigator.clipboard?.writeText(String(user.email))
                }}
                className="shrink-0 rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Copy email
              </button>
              <button
                type="button"
                onClick={() => setPasswordOpen(true)}
                className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Reset Password
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2 border-t border-slate-100 bg-slate-50/50 px-6 py-4">
          {user.role === ROLES.PARTY_A && (
            <Link
              to={profilePaths.detail(user.id)}
              className="rounded-lg bg-portal-primary px-4 py-2 text-sm font-semibold text-white hover:bg-portal-primary-hover"
            >
              View Party A Profile
            </Link>
          )}
          {user.role === ROLES.PARTY_B && (
            <Link
              to={partyBProfilePaths.detail(user.id)}
              className="rounded-lg bg-portal-primary px-4 py-2 text-sm font-semibold text-white hover:bg-portal-primary-hover"
            >
              View Party B Profile
            </Link>
          )}
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Edit Profile
          </button>
          <button
            type="button"
            onClick={() => setRoleOpen(true)}
            className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm font-semibold text-green-800 hover:bg-green-100"
          >
            Change Role
          </button>
          <button
            type="button"
            onClick={() => setPasswordOpen(true)}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Reset Password
          </button>
          {user.role === 'party_b' && (
            <button
              type="button"
              onClick={handleIssueCredentials}
              disabled={actionLoading}
              className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-50"
            >
              Issue Party B Login
            </button>
          )}
          <button
            type="button"
            onClick={openDeleteModal}
            disabled={isSelf || !canDelete}
            title={
              isSelf
                ? 'Cannot delete your own account'
                : !canDelete
                  ? 'User has portal records that cannot be unlinked'
                  : isPartyB
                    ? 'Delete Party B account and unlink portal access'
                    : 'Delete user'
            }
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-800 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Delete User
          </button>
        </div>
      </div>

      {user.stats && (
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="text-lg font-semibold text-slate-800">Activity Summary</h2>
            {hasRecords && (
              <p className="mt-1 text-xs text-amber-700">
                {isPartyB
                  ? 'This user is linked to portal records. You can delete the account and unlink portal access while keeping proposal and MOU data.'
                  : 'This user has portal records — delete is blocked until records are reassigned or archived.'}
              </p>
            )}
          </div>
          <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(STAT_LABELS).map(([key, label]) => (
              <div
                key={key}
                className="rounded-lg border border-slate-100 bg-slate-50/50 px-4 py-3"
              >
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  {label}
                </p>
                <p className="mt-1 text-2xl font-bold text-slate-800">{user.stats[key] ?? 0}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <Modal
        open={editOpen}
        title="Edit Profile"
        onClose={() => setEditOpen(false)}
        onConfirm={handleUpdate}
        confirmLabel="Save"
        loading={actionLoading}
        confirmDisabled={!editForm.full_name.trim() || !editForm.email.trim()}
      >
        <div className="space-y-3">
          <Input label="Full Name" value={editForm.full_name} onChange={(v) => setEditForm((f) => ({ ...f, full_name: v }))} />
          <Input label="Email" value={editForm.email} onChange={(v) => setEditForm((f) => ({ ...f, email: v }))} />
          {userNeedsSector && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Sector</label>
              <select
                value={editForm.sector}
                onChange={(e) => setEditForm((f) => ({ ...f, sector: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                {sectors.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          )}
          <Input label="Organization" value={editForm.organization} onChange={(v) => setEditForm((f) => ({ ...f, organization: v }))} />
          <Input label="Phone" value={editForm.phone} onChange={(v) => setEditForm((f) => ({ ...f, phone: v }))} />
        </div>
      </Modal>

      <Modal
        open={roleOpen}
        title="Change Role"
        onClose={() => setRoleOpen(false)}
        onConfirm={handleRoleChange}
        confirmLabel="Update Role"
        loading={actionLoading}
        confirmDisabled={roleNeedsSector && !roleForm.sector.trim()}
      >
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Role</label>
            <select
              value={roleForm.role}
              onChange={(e) => setRoleForm((f) => ({ ...f, role: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              {roles.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          {roleNeedsSector && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Sector</label>
              <select
                value={roleForm.sector}
                onChange={(e) => setRoleForm((f) => ({ ...f, sector: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                {sectors.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          )}
          {isSelf && roleForm.role !== 'super_admin' && (
            <p className="text-xs text-amber-700">You cannot remove your own super admin role.</p>
          )}
        </div>
      </Modal>

      <Modal
        open={passwordOpen}
        title="Reset Password"
        onClose={() => setPasswordOpen(false)}
        onConfirm={handlePasswordReset}
        confirmLabel="Reset Password"
        loading={actionLoading}
        confirmDisabled={
          passwordForm.password.length < 6 ||
          passwordForm.password !== passwordForm.confirm
        }
      >
        <div className="space-y-3">
          {user?.email && (
            <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              Login email: <code className="font-medium text-slate-800">{user.email}</code>
              <br />
              Previous password cannot be retrieved — this sets a new one to share with the user.
            </p>
          )}
          <Input
            label="New Password"
            type="password"
            value={passwordForm.password}
            onChange={(v) => setPasswordForm((f) => ({ ...f, password: v }))}
          />
          <Input
            label="Confirm Password"
            type="password"
            value={passwordForm.confirm}
            onChange={(v) => setPasswordForm((f) => ({ ...f, confirm: v }))}
          />
        </div>
      </Modal>

      <Modal
        open={deleteOpen}
        title={deleteWithUnlink ? 'Delete & unlink portal access?' : 'Delete User?'}
        onClose={() => {
          setDeleteOpen(false)
          setDeleteRefs(null)
          setDeleteUnlinkMode(false)
          setDeleteHint('')
        }}
        onConfirm={handleDelete}
        confirmLabel={deleteWithUnlink ? 'Delete & unlink' : 'Delete'}
        confirmVariant="danger"
        loading={actionLoading}
        confirmDisabled={!(canDelete || deleteUnlinkMode)}
      >
        {deleteWithUnlink ? (
          <div className="space-y-3 text-sm text-slate-600">
            <p>
              Permanently delete <strong>{user.full_name}</strong> ({user.email}) and remove portal
              links from linked records.
            </p>
            <p>
              Proposal records stay on file — Party B name, email, and MOU data are not removed.
              Only the login account and Party B profile are deleted.
            </p>
            {deleteRefs && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
                Portal links to remove: {formatReferencesSummary(deleteRefs)}.
              </p>
            )}
            {deleteHint && (
              <p className="text-xs text-slate-500">{deleteHint}</p>
            )}
          </div>
        ) : hasRecords ? (
          <p className="text-sm text-slate-600">
            Cannot delete <strong>{user.full_name}</strong> — linked to{' '}
            {formatStatsSummary(user.stats)}.
          </p>
        ) : deleteRefs ? (
          <div className="space-y-2 text-sm text-slate-600">
            <p className="text-red-700">
              Delete blocked: {formatReferencesSummary(deleteRefs)}.
            </p>
            {deleteHint && <p className="text-xs text-slate-500">{deleteHint}</p>}
          </div>
        ) : (
          <p className="text-sm text-slate-600">
            Permanently delete <strong>{user.full_name}</strong> ({user.email})? This cannot be
            undone.
          </p>
        )}
      </Modal>

      <Modal
        open={Boolean(slReassignBlock)}
        title="Transfer cases to a new officer first"
        onClose={() => setSlReassignBlock(null)}
        hideFooter
      >
        <p className="text-sm text-slate-600">
          Cannot delete <strong>{user.full_name}</strong> — this Sector Lead still has open
          assignments:
        </p>
        <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-slate-700">
          <li>{slReassignBlock?.open_complaints ?? 0} open complaint(s)</li>
          <li>{slReassignBlock?.open_china_proposals ?? 0} open China proposal(s)</li>
        </ul>
        {slReassignBlock?.message && (
          <p className="mt-3 text-xs text-slate-500">{slReassignBlock.message}</p>
        )}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => setSlReassignBlock(null)}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <Link
            to={
              slReassignBlock?.sector
                ? `/admin/settings/sector-officer/reassign`
                : '/dashboard/super-admin/sector-lead/handoff'
            }
            onClick={() => setSlReassignBlock(null)}
            className="inline-flex items-center justify-center rounded-lg bg-portal-primary px-4 py-2 text-sm font-semibold text-white hover:bg-portal-primary-hover"
          >
            Transfer to new officer →
          </Link>
        </div>
      </Modal>

      <PartyBCredentialsModal
        open={Boolean(partyBCredentials)}
        credentials={partyBCredentials}
        title="Party B login credentials"
        subtitle={partyBCredentialsSubtitle}
        onClose={() => {
          setPartyBCredentials(null)
          setPartyBCredentialsSubtitle('')
        }}
      />
    </div>
  )
}

function Info({ label, value }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-800">{value || '—'}</p>
    </div>
  )
}

function Input({ label, value, onChange, type = 'text' }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
      />
    </div>
  )
}
