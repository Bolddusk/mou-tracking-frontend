import { parseMouProgressText } from '../../utils/mouProgressDisplay'

function ProgressTimestamp({ timestamp, variant = 'detail' }) {
  if (!timestamp) return null

  if (variant === 'hero') {
    return (
      <p className="text-[10px] font-medium uppercase tracking-wide text-emerald-200/90">
        {timestamp}
      </p>
    )
  }

  return (
    <p className="mb-2 flex items-center gap-2">
      <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Recorded</span>
      <span className="inline-flex rounded-md bg-white px-2.5 py-1 text-xs font-semibold tabular-nums text-slate-700 ring-1 ring-slate-200">
        {timestamp}
      </span>
    </p>
  )
}

function ProgressBody({ body, variant = 'detail' }) {
  if (!body) return null

  if (variant === 'hero') {
    return (
      <p className="mt-1 line-clamp-2 text-sm font-semibold leading-snug text-white">{body}</p>
    )
  }

  return (
    <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{body}</p>
  )
}

export default function MouProgressValue({ value, variant = 'detail' }) {
  const { entries, raw } = parseMouProgressText(value)

  if (!entries.length) {
    const emptyClass = variant === 'hero' ? 'text-sm text-slate-400' : 'text-sm text-slate-400'
    return <span className={emptyClass}>—</span>
  }

  if (variant === 'hero') {
    const latest = entries[entries.length - 1]
    return (
      <div className="text-left sm:text-right">
        <ProgressTimestamp timestamp={latest.timestamp} variant="hero" />
        <ProgressBody body={latest.body || (!latest.timestamp ? raw : '')} variant="hero" />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {[...entries].reverse().map((entry, index) => (
        <div
          key={`${entry.timestamp}-${index}`}
          className="rounded-lg border border-slate-200/80 bg-white px-3 py-2.5 shadow-sm"
        >
          <ProgressTimestamp timestamp={entry.timestamp} variant="detail" />
          <ProgressBody body={entry.body} variant="detail" />
        </div>
      ))}
    </div>
  )
}
