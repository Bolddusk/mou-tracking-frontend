import LoadingSpinner from './LoadingSpinner'

export default function Modal({
  open,
  title,
  children,
  onClose,
  onConfirm,
  confirmLabel = 'Confirm',
  confirmDisabled = false,
  loading = false,
  confirmVariant = 'primary',
  hideFooter = false,
}) {
  if (!open) return null

  const confirmClass =
    confirmVariant === 'danger'
      ? 'bg-red-600 hover:bg-red-700'
      : 'bg-portal-primary hover:bg-portal-primary-hover text-white'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-label="Close modal backdrop"
      />
      <div className="relative z-10 w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h3 className="mb-4 text-lg font-semibold text-slate-800">{title}</h3>
        {children}
        {!hideFooter && (
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          {onConfirm && (
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading || confirmDisabled}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${confirmClass}`}
            >
              {loading && <LoadingSpinner size="sm" />}
              {confirmLabel}
            </button>
          )}
        </div>
        )}
      </div>
    </div>
  )
}
