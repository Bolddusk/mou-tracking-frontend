export default function Alert({ type = 'error', message, onClose }) {
  if (!message) return null

  const styles = {
    error: 'bg-red-50 border-red-200 text-red-800',
    success: 'bg-green-50 border-green-200 text-green-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-900',
  }

  return (
    <div
      className={`mb-4 flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${styles[type]}`}
      role="alert"
    >
      <span>{message}</span>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 opacity-60 hover:opacity-100"
          aria-label="Dismiss"
        >
          ×
        </button>
      )}
    </div>
  )
}
