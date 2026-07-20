import { Link } from 'react-router-dom'

const VARIANTS = {
  view: 'text-green-700 hover:bg-green-50 border-slate-200',
  edit: 'text-orange-600 hover:bg-orange-50 border-slate-200',
  delete: 'text-red-600 hover:bg-red-50 border-slate-200',
  approve: 'text-green-700 hover:bg-green-50 border-slate-200',
  reject: 'text-red-600 hover:bg-red-50 border-slate-200',
  file: 'text-blue-600 hover:bg-blue-50 border-slate-200',
}

/**
 * Prefer `to` for navigable actions so Ctrl/Cmd+click and middle-click open a new tab.
 * Use `onClick` alone for non-navigation actions (approve, delete, modals).
 */
export function IconButton({
  onClick,
  to,
  title,
  variant = 'view',
  disabled = false,
  children,
}) {
  const className = `inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border bg-white transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${VARIANTS[variant]}`

  if (to && !disabled) {
    return (
      <Link to={to} title={title} aria-label={title} className={className} onClick={onClick}>
        {children}
      </Link>
    )
  }

  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      className={className}
    >
      {children}
    </button>
  )
}

export function ViewIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  )
}

export function EditIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  )
}

export function ApproveIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}

export function RejectIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

export function DeleteIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  )
}

export function FileIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  )
}

export function ActionGroup({ children }) {
  return <div className="flex items-center gap-1">{children}</div>
}
