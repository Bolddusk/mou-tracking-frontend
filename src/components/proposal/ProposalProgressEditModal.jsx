import { useEffect, useState } from 'react'
import Modal from '../Modal'

export default function ProposalProgressEditModal({
  open,
  initial,
  loading = false,
  onClose,
  onSave,
}) {
  const [form, setForm] = useState({
    activity_date: '',
    title: '',
    description: '',
    support_file_url: '',
  })

  useEffect(() => {
    if (!open || !initial) return
    setForm({
      activity_date: initial.activity_date || initial.progress_date || '',
      title: initial.title || '',
      description: initial.description || '',
      support_file_url: initial.support_file_url || '',
    })
  }, [open, initial])

  return (
    <Modal
      open={open}
      title="Edit progress update"
      onClose={onClose}
      onConfirm={() => onSave?.(form)}
      confirmLabel="Save changes"
      loading={loading}
      confirmDisabled={!form.title.trim() || !form.activity_date}
    >
      <div className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Progress date</span>
          <input
            type="date"
            value={form.activity_date}
            onChange={(e) => setForm((f) => ({ ...f, activity_date: e.target.value }))}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Title</span>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Description</span>
          <textarea
            rows={4}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        {form.support_file_url && (
          <p className="text-xs text-slate-500">
            Support file attached — upload a new file from the add flow to replace.
          </p>
        )}
      </div>
    </Modal>
  )
}
