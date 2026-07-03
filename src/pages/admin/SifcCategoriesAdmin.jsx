import { useCallback, useEffect, useState } from 'react'
import * as sifcApi from '../../api/sifcCategories'
import Alert from '../../components/Alert'
import LoadingSpinner from '../../components/LoadingSpinner'
import Modal from '../../components/Modal'
import { getErrorMessage } from '../../utils/format'

const EMPTY_FORM = { name: '', sort_order: '0', is_active: true }

export default function SifcCategoriesAdmin() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await sifcApi.getAdminSifcCategories()
      setItems(Array.isArray(data?.categories) ? data.categories : [])
    } catch (err) {
      setError(getErrorMessage(err))
      setItems([])
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

  const openEdit = (row) => {
    setEditing(row)
    setForm({
      name: row.name || '',
      sort_order: String(row.sort_order ?? 0),
      is_active: row.is_active !== false,
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
      setError('Category name is required')
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
        await sifcApi.updateSifcCategory(editing.id, body)
        setSuccess('SIFC category updated')
      } else {
        await sifcApi.createSifcCategory(body)
        setSuccess('SIFC category created')
      }
      closeEditor()
      await load()
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
      await sifcApi.deleteSifcCategory(deleteTarget.id)
      setSuccess(`Category "${deleteTarget.name}" deleted`)
      setDeleteTarget(null)
      await load()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const handleDeactivate = async () => {
    if (!deleteTarget) return
    setSaving(true)
    setError('')
    try {
      await sifcApi.updateSifcCategory(deleteTarget.id, { is_active: false })
      setSuccess(`Category "${deleteTarget.name}" deactivated`)
      setDeleteTarget(null)
      await load()
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
          <h3 className="text-lg font-semibold text-slate-800">SIFC Categories</h3>
          <p className="mt-1 text-sm text-slate-500">
            Lookup list for MOU edit — maps to <code className="text-xs">executive_summary.sifc_category</code>.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-lg bg-portal-primary px-4 py-2 text-sm font-semibold text-white hover:bg-portal-primary-hover"
        >
          + Add category
        </button>
      </div>

      <Alert type="error" message={error} onClose={() => setError('')} />
      <Alert type="success" message={success} onClose={() => setSuccess('')} />

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner size="lg" />
          </div>
        ) : items.length === 0 ? (
          <p className="py-16 text-center text-slate-500">No SIFC categories found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[640px] w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Order</th>
                  <th className="px-4 py-3 font-semibold">Active</th>
                  <th className="px-4 py-3 font-semibold">MOUs</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-medium text-slate-800">{row.name}</td>
                    <td className="px-4 py-3 text-slate-600">{row.sort_order ?? 0}</td>
                    <td className="px-4 py-3">
                      {row.is_active !== false ? (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">
                          Yes
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                          No
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{row.usage?.proposals ?? '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(row)}
                          className="text-xs font-semibold text-portal-primary hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(row)}
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
        title={editing ? 'Edit SIFC category' : 'Add SIFC category'}
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
              placeholder="Trade – Export"
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
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
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
        title="Delete SIFC category"
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        confirmLabel="Delete"
        confirmVariant="danger"
        loading={saving}
      >
        <p className="text-sm text-slate-600">
          Delete <strong>{deleteTarget?.name}</strong>? Fails if used on MOUs — deactivate instead.
        </p>
        <button
          type="button"
          onClick={handleDeactivate}
          disabled={saving}
          className="mt-3 text-sm font-semibold text-portal-primary hover:underline"
        >
          Deactivate instead
        </button>
      </Modal>
    </div>
  )
}
