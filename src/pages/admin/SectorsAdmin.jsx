import { useCallback, useEffect, useState } from 'react'
import * as sectorsApi from '../../api/sectors'
import Alert from '../../components/Alert'
import LoadingSpinner from '../../components/LoadingSpinner'
import Modal from '../../components/Modal'
import { useSectors } from '../../context/SectorsContext'
import { getErrorMessage } from '../../utils/format'

const EMPTY_FORM = { name: '', sort_order: '0', is_active: true }

export default function SectorsAdmin() {
  const { refreshSectors } = useSectors()
  const [sectors, setSectors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteUsage, setDeleteUsage] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await sectorsApi.getAdminSectors()
      setSectors(Array.isArray(data?.sectors) ? data.sectors : [])
    } catch (err) {
      setError(getErrorMessage(err))
      setSectors([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setEditorOpen(true)
  }

  const openEdit = (sector) => {
    setEditing(sector)
    setForm({
      name: sector.name || '',
      sort_order: String(sector.sort_order ?? 0),
      is_active: sector.is_active !== false,
    })
    setEditorOpen(true)
  }

  const closeEditor = () => {
    setEditorOpen(false)
    setEditing(null)
    setForm(EMPTY_FORM)
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError('Sector name is required')
      return
    }
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const body = {
        name: form.name.trim(),
        sort_order: Number(form.sort_order) || 0,
        is_active: form.is_active,
      }
      if (editing) {
        await sectorsApi.updateSector(editing.id, body)
        setSuccess('Sector updated')
      } else {
        await sectorsApi.createSector(body)
        setSuccess('Sector created')
      }
      closeEditor()
      await Promise.all([load(), refreshSectors()])
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      await sectorsApi.deleteSector(deleteTarget.id)
      setSuccess(`Sector "${deleteTarget.name}" deleted`)
      setDeleteTarget(null)
      setDeleteUsage(null)
      await Promise.all([load(), refreshSectors()])
    } catch (err) {
      const msg = getErrorMessage(err)
      const usage = err?.response?.data?.usage
      if (err?.response?.status === 409 && usage) {
        setDeleteUsage(usage)
      }
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  const handleDeactivateInstead = async () => {
    if (!deleteTarget) return
    setSaving(true)
    setError('')
    try {
      await sectorsApi.updateSector(deleteTarget.id, { is_active: false })
      setSuccess(`Sector "${deleteTarget.name}" deactivated`)
      setDeleteTarget(null)
      setDeleteUsage(null)
      await Promise.all([load(), refreshSectors()])
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">Sectors</h3>
          <p className="mt-1 text-sm text-slate-500">
            Manage sector names for proposals, users, and filters. Inactive sectors are hidden from
            dropdowns but remain on existing records.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-lg bg-portal-primary px-4 py-2 text-sm font-semibold text-white hover:bg-portal-primary-hover"
        >
          + Add sector
        </button>
      </div>

      <Alert type="error" message={error} onClose={() => setError('')} />
      <Alert type="success" message={success} onClose={() => setSuccess('')} />

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner size="lg" />
          </div>
        ) : sectors.length === 0 ? (
          <p className="py-16 text-center text-slate-500">No sectors found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Order</th>
                  <th className="px-4 py-3 font-semibold">Active</th>
                  <th className="px-4 py-3 font-semibold">Proposals</th>
                  <th className="px-4 py-3 font-semibold">Users</th>
                  <th className="px-4 py-3 font-semibold">MM</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sectors.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80">
                    <td className="max-w-[280px] px-4 py-3 font-medium text-slate-800">{s.name}</td>
                    <td className="px-4 py-3 text-slate-600">{s.sort_order ?? 0}</td>
                    <td className="px-4 py-3">
                      {s.is_active !== false ? (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">
                          Yes
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                          No
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{s.usage?.proposals ?? 0}</td>
                    <td className="px-4 py-3 text-slate-600">{s.usage?.users ?? 0}</td>
                    <td className="px-4 py-3 text-slate-600">{s.usage?.mm_proposals ?? 0}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(s)}
                          className="text-xs font-semibold text-portal-primary hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteTarget(s)
                            setDeleteUsage(null)
                          }}
                          className="text-xs font-semibold text-red-600 hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={editorOpen}
        title={editing ? 'Edit sector' : 'Add sector'}
        onClose={closeEditor}
        onConfirm={handleSave}
        confirmLabel={editing ? 'Save' : 'Create'}
        loading={saving}
        confirmDisabled={!form.name.trim()}
      >
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Name</span>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-portal-primary focus:ring-2 focus:ring-portal-primary/30"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Sort order</span>
            <input
              type="number"
              min={0}
              value={form.sort_order}
              onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-portal-primary focus:ring-2 focus:ring-portal-primary/30"
            />
            <p className="mt-1 text-xs text-slate-500">Lower numbers appear first in dropdowns.</p>
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
              className="rounded border-slate-300"
            />
            Active (show in dropdowns)
          </label>
        </div>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        title="Delete sector"
        onClose={() => {
          setDeleteTarget(null)
          setDeleteUsage(null)
        }}
        onConfirm={deleteUsage ? handleDeactivateInstead : handleDelete}
        confirmLabel={deleteUsage ? 'Deactivate instead' : 'Delete'}
        confirmVariant={deleteUsage ? 'primary' : 'danger'}
        loading={saving}
        hideFooter={false}
      >
        <p className="text-sm text-slate-600">
          Delete <strong>{deleteTarget?.name}</strong>?
          {!deleteUsage && ' Only allowed when no proposals, users, or matchmaking records use it.'}
        </p>
        {deleteUsage && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <p className="font-semibold">Sector is in use ({deleteUsage.total} records)</p>
            <p className="mt-1 text-xs">
              {deleteUsage.proposals} proposal(s) · {deleteUsage.users} user(s) ·{' '}
              {deleteUsage.mm_proposals} matchmaking record(s)
            </p>
            <p className="mt-2 text-xs">Deactivate to hide from new dropdowns without deleting data.</p>
          </div>
        )}
      </Modal>
    </div>
  )
}
