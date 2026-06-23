export default function LoadingSpinner({ size = 'md', className = '' }) {
  const sizeClass =
    size === 'sm' ? 'h-4 w-4 border-2' : size === 'lg' ? 'h-10 w-10 border-4' : 'h-6 w-6 border-2'

  return (
    <span
      className={`inline-block animate-spin rounded-full border-slate-300 border-t-portal-primary ${sizeClass} ${className}`}
      role="status"
      aria-label="Loading"
    />
  )
}
