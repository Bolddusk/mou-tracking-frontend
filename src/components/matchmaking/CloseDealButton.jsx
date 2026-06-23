import { useState } from 'react'
import Modal from '../Modal'

export default function CloseDealButton({ onConfirm, loading = false, disabled = false }) {
  const [open, setOpen] = useState(false)

  const handleConfirm = async () => {
    await onConfirm()
    setOpen(false)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled || loading}
        className="inline-flex items-center justify-center rounded-lg bg-portal-primary px-4 py-2 text-sm font-semibold text-white hover:bg-portal-primary-hover disabled:opacity-50"
      >
        Close Deal
      </button>

      <Modal
        open={open}
        title="Close Deal"
        onClose={() => setOpen(false)}
        onConfirm={handleConfirm}
        confirmLabel="Close Deal"
        loading={loading}
      >
        <p className="text-sm text-slate-600">
          Both parties have signed the MOU. Close this deal? No further edits will be allowed.
        </p>
      </Modal>
    </>
  )
}
