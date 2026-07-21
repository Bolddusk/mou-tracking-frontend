import { useCallback, useEffect, useState } from 'react'
import * as ministriesApi from '../../api/ministries'
import Alert from '../../components/Alert'
import LoadingSpinner from '../../components/LoadingSpinner'
import Modal from '../../components/Modal'
import { getErrorMessage } from '../../utils/format'

const EMPTY_FORM = {
  code: '',
  name: '',
  is_active: true,
}

export default function MinistriesAdmin() {
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
      const res = await ministriesApi.listMinistries({ all: true })
      setItems(res.data || [])
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
      code: row.code || '',
      name: row.name || '',
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
    if (!form.name.trim() || !form.code.trim()) {
      setError('Code and name are required')
      return
    }
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const body = {
        code: form.code.trim().toLowerCase(),
        name: form.name.trim(),
        is_active: form.is_active,
      }
      if (editing) {
        await ministriesApi.updateMinistry(editing.id, body)
        setSuccess('Ministry updated')
      } else {
        await ministriesApi.createMinistry({ code: body.code, name: body.name })
        setSuccess('Ministry created')
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
      await ministriesApi.deleteMinistry(deleteTarget.id)
      setSuccess(`Ministry "${deleteTarget.name}" deleted`)
      setDeleteTarget(null)
      await load()
    } catch (err) {
      const data = err?.response?.data
      if (data?.usage) {
        const u = data.usage
        setError(
          `${getErrorMessage(err)} In use: ${u.users ?? 0} users, ${u.proposals ?? 0} proposals, ${u.conferences ?? 0} conferences — deactivate instead.`,
        )
      } else {
        setError(getErrorMessage(err))
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">Ministries</h3>
          <p className="text-sm text-slate-500">
            Tenant ministries for MOUs, conferences, and scoped users
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center justify-center rounded-lg bg-portal-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-portal-primary-hover"
        >
          Add Ministry
        </button>
      </div>

      <Alert type="error" message={error} onClose={() => setError('')} />
      <Alert type="success" message={success} onClose={() => setSuccess('')} />

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner size="lg" />
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center text-slate-500">No ministries yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[720px] w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Code</th>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-700">
                      {m.code}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">{m.name}</td>
                    <td className="px-4 py-3">
                      {m.is_active !== false ? (
                        <span className="inline-flex rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(m)}
                          className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          Edit
                        </button>
                        {String(m.code).toLowerCase() !== 'mnfsr' && (
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(m)}
                            className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
                          >
                            Delete
                          </button>
                        )}
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
        title={editing ? 'Edit Ministry' : 'Add Ministry'}
        onClose={closeEditor}
        onConfirm={handleSave}
        confirmLabel={editing ? 'Save' : 'Create'}
        loading={saving}
        confirmDisabled={!form.code.trim() || !form.name.trim()}
      >
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Code</label>
            <input
              type="text"
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              placeholder="e.g. power"
              disabled={Boolean(editing) && String(editing.code).toLowerCase() === 'mnfsr'}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Ministry of …"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          {editing && (
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
              />
              Active
            </label>
          )}
        </div>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        title="Delete ministry?"
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        confirmLabel="Delete"
        confirmVariant="danger"
        loading={saving}
      >
        <p className="text-sm text-slate-600">
          Permanently delete <strong>{deleteTarget?.name}</strong>? If it is in use, deactivate
          it instead.
        </p>
      </Modal>
    </div>
  )
}
