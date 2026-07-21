import { useCallback, useEffect, useState } from 'react'
import * as conferencesApi from '../../api/conferences'
import * as ministriesApi from '../../api/ministries'
import Alert from '../../components/Alert'
import LoadingSpinner from '../../components/LoadingSpinner'
import Modal from '../../components/Modal'
import { getErrorMessage, toDateInputValue } from '../../utils/format'

const DEFAULT_ENGAGEMENT_TYPES = ['B2B', 'B2G', 'G2B', 'G2G']

const EMPTY_FORM = {
  conference_key: '',
  name: '',
  ministry_id: '',
  engagement_type: '',
  description: '',
  conference_date: '',
  conference_end_date: '',
  location: '',
  host: '',
  report_title: '',
  supports_report: false,
  sort_order: '0',
  is_active: true,
}

export default function ConferencesAdmin() {
  const [items, setItems] = useState([])
  const [ministries, setMinistries] = useState([])
  const [engagementTypes, setEngagementTypes] = useState(DEFAULT_ENGAGEMENT_TYPES)
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
      const [data, ministryRes] = await Promise.all([
        conferencesApi.getAdminConferences(),
        ministriesApi.listMinistries().catch(() => ({ data: [] })),
      ])
      setItems(Array.isArray(data?.conferences) ? data.conferences : [])
      setMinistries(ministryRes?.data || [])
      if (Array.isArray(data?.engagement_types) && data.engagement_types.length) {
        setEngagementTypes(data.engagement_types)
      }
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
    setForm({
      ...EMPTY_FORM,
      ministry_id: ministries[0] ? String(ministries[0].id) : '',
    })
    setEditorOpen(true)
  }

  const openEdit = (row) => {
    setEditing(row)
    setForm({
      conference_key: row.conference_key || row.key || '',
      name: row.name || '',
      ministry_id: row.ministry_id != null ? String(row.ministry_id) : '',
      engagement_type: row.engagement_type ? String(row.engagement_type).toUpperCase() : '',
      description: row.description || '',
      conference_date: toDateInputValue(row.conference_date),
      conference_end_date: toDateInputValue(row.conference_end_date),
      location: row.location || '',
      host: row.host || '',
      report_title: row.report_title || '',
      supports_report: row.supports_report === true,
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
      setError('Conference name is required')
      return
    }
    if (!editing && !form.conference_key.trim()) {
      setError('Conference key is required')
      return
    }
    if (!form.ministry_id) {
      setError('Ministry is required')
      return
    }

    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const body = {
        name: form.name.trim(),
        ministry_id: Number(form.ministry_id),
        engagement_type: form.engagement_type || undefined,
        description: form.description.trim() || undefined,
        conference_date: form.conference_date || undefined,
        conference_end_date: form.conference_end_date || undefined,
        location: form.location.trim() || undefined,
        host: form.host.trim() || undefined,
        report_title: form.report_title.trim() || undefined,
        supports_report: form.supports_report,
        sort_order: Number(form.sort_order) || 0,
        is_active: form.is_active,
      }
      if (editing) {
        if (form.conference_key.trim()) body.conference_key = form.conference_key.trim()
        await conferencesApi.updateConference(editing.id, body)
        setSuccess('Conference updated')
      } else {
        body.conference_key = form.conference_key.trim()
        await conferencesApi.createConference(body)
        setSuccess('Conference created')
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
      await conferencesApi.deleteConference(deleteTarget.id)
      setSuccess(`Conference "${deleteTarget.name}" deleted`)
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
      await conferencesApi.updateConference(deleteTarget.id, { is_active: false })
      setSuccess(`Conference "${deleteTarget.name}" deactivated`)
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
          <h3 className="text-lg font-semibold text-slate-800">Conferences</h3>
          <p className="mt-1 text-sm text-slate-500">
            Manage conference lookup list for MOU edit dropdowns and SIFC reports.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-lg bg-portal-primary px-4 py-2 text-sm font-semibold text-white hover:bg-portal-primary-hover"
        >
          + Add conference
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
          <p className="py-16 text-center text-slate-500">No conferences found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[960px] w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Ministry</th>
                  <th className="px-4 py-3 font-semibold">Key</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Order</th>
                  <th className="px-4 py-3 font-semibold">Active</th>
                  <th className="px-4 py-3 font-semibold">Report</th>
                  <th className="px-4 py-3 font-semibold">MOUs</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80">
                    <td className="max-w-[240px] px-4 py-3 font-medium text-slate-800">{row.name}</td>
                    <td className="max-w-[160px] truncate px-4 py-3 text-slate-600">
                      {row.ministry?.name || row.ministry_name || '—'}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">
                      {row.conference_key || row.key}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{row.engagement_type || '—'}</td>
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
                    <td className="px-4 py-3 text-slate-600">
                      {row.supports_report ? 'Yes' : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{row.usage?.proposals ?? row.proposal_count ?? '—'}</td>
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
        title={editing ? 'Edit conference' : 'Add conference'}
        onClose={closeEditor}
        onConfirm={handleSave}
        confirmLabel={editing ? 'Save' : 'Create'}
        loading={saving}
        confirmDisabled={!form.name.trim() || !form.ministry_id}
        panelClassName="max-w-2xl"
      >
        <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
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
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Ministry <span className="text-red-500">*</span>
            </span>
            <select
              value={form.ministry_id}
              onChange={(e) => setForm((f) => ({ ...f, ministry_id: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-portal-primary focus:ring-2 focus:ring-portal-primary/30"
              required
            >
              <option value="">Select ministry</option>
              {ministries.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Conference key</span>
            <input
              type="text"
              value={form.conference_key}
              onChange={(e) => setForm((f) => ({ ...f, conference_key: e.target.value }))}
              placeholder="pak-china-sep-25-conference"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-portal-primary focus:ring-2 focus:ring-portal-primary/30"
            />
            <p className="mt-1 text-xs text-slate-500">Slug format — server may normalize on save.</p>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Engagement type</span>
            <select
              value={form.engagement_type}
              onChange={(e) => setForm((f) => ({ ...f, engagement_type: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-portal-primary focus:ring-2 focus:ring-portal-primary/30"
            >
              <option value="">Select type</option>
              {engagementTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Description</span>
            <textarea
              rows={4}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Conference details — synced to MOU conference_info when selected"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-portal-primary focus:ring-2 focus:ring-portal-primary/30"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Start date</span>
              <input
                type="date"
                value={form.conference_date}
                onChange={(e) => setForm((f) => ({ ...f, conference_date: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">End date</span>
              <input
                type="date"
                value={form.conference_end_date}
                onChange={(e) => setForm((f) => ({ ...f, conference_end_date: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Location</span>
            <input
              type="text"
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Host</span>
            <input
              type="text"
              value={form.host}
              onChange={(e) => setForm((f) => ({ ...f, host: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">SIFC report title</span>
            <input
              type="text"
              value={form.report_title}
              onChange={(e) => setForm((f) => ({ ...f, report_title: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
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
              checked={form.supports_report}
              onChange={(e) => setForm((f) => ({ ...f, supports_report: e.target.checked }))}
              className="rounded border-slate-300"
            />
            Supports SIFC report export
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
        title="Delete conference"
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        confirmLabel="Delete"
        confirmVariant="danger"
        loading={saving}
        hideFooter={false}
      >
        <p className="text-sm text-slate-600">
          Delete <strong>{deleteTarget?.name}</strong>? Fails if linked to proposals — deactivate
          instead.
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
