import { useState } from 'react'
import { ROLE_LABELS } from '../../constants/sectors'
import { formatDate, formatRelativeTime } from '../../utils/format'

function formatChangeValue(value) {
  if (value == null || value === '') {
    return <span className="text-slate-400">—</span>
  }
  return <span className="whitespace-pre-wrap break-words text-slate-700">{String(value)}</span>
}

function RevisionBeforeAfter({ revision }) {
  if (revision.details?.length) {
    return (
      <ul className="mt-2 space-y-1 text-sm text-slate-700">
        {revision.details.map((line, index) => (
          <li key={index} className="flex gap-2">
            <span className="text-slate-400">•</span>
            <span>{line}</span>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <div className="mt-2 overflow-x-auto rounded-lg border border-slate-100 bg-slate-50/60">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-3 py-2 font-semibold">Before</th>
            <th className="w-8 px-1 py-2 text-center font-normal text-slate-400">→</th>
            <th className="px-3 py-2 font-semibold">After</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="max-w-[240px] px-3 py-2.5 text-slate-600">
              {formatChangeValue(revision.oldValue)}
            </td>
            <td className="px-1 py-2.5 text-center text-slate-300">→</td>
            <td className="max-w-[240px] px-3 py-2.5 text-slate-600">
              {formatChangeValue(revision.newValue)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function FieldRevisionNode({ revision, isLast }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className={`relative pl-6 ${isLast ? '' : 'pb-4'}`}>
      <span
        className="absolute left-0 top-2 h-2 w-2 rounded-full border-2 border-white bg-green-600 shadow-sm"
        aria-hidden
      />
      {!isLast && (
        <span className="absolute bottom-0 left-[3px] top-4 w-0.5 bg-green-200" aria-hidden />
      )}

      <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800">
              {revision.changedByName || 'Unknown user'}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {ROLE_LABELS[revision.changedByRole] || revision.changedByRole || '—'}
              <span className="mx-1.5 text-slate-300">·</span>
              <span title={formatDate(revision.createdAt)}>
                {formatRelativeTime(revision.createdAt)}
              </span>
              <span className="mx-1.5 text-slate-300">·</span>
              {formatDate(revision.createdAt)}
            </p>
          </div>
          {revision.actionLabel && (
            <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
              {revision.actionLabel}
            </span>
          )}
        </div>

        {revision.summary && (
          <p className="mt-2 text-xs text-slate-500">{revision.summary}</p>
        )}

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-portal-primary hover:underline"
        >
          <span
            className={`inline-block text-[10px] transition-transform ${expanded ? 'rotate-90' : ''}`}
            aria-hidden
          >
            ▶
          </span>
          {expanded ? 'Hide before / after' : 'Show before / after'}
        </button>

        {expanded && <RevisionBeforeAfter revision={revision} />}
      </div>
    </div>
  )
}

function FieldGroupBranch({ group, defaultExpanded = false }) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const count = group.revisions.length

  return (
    <div className="relative">
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50/80"
        >
          <div className="flex min-w-0 items-center gap-2">
            <span
              className={`shrink-0 text-[10px] text-portal-primary transition-transform ${expanded ? 'rotate-90' : ''}`}
              aria-hidden
            >
              ▶
            </span>
            <span className="truncate text-sm font-semibold text-slate-900">{group.label}</span>
          </div>
          <span className="shrink-0 rounded-full bg-green-50 px-2.5 py-0.5 text-[11px] font-semibold text-green-900 ring-1 ring-green-200">
            {count} update{count === 1 ? '' : 's'}
          </span>
        </button>

        {expanded && (
          <div className="border-t border-slate-100 px-4 py-3">
            <div className="relative">
              {group.revisions.map((revision, index) => (
                <FieldRevisionNode
                  key={`${revision.logId}-${index}`}
                  revision={revision}
                  isLast={index === group.revisions.length - 1}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ChangeLogFieldTree({ groups, editSessionCount = 0 }) {
  if (!groups.length) return null

  const revisionCount = groups.reduce((sum, g) => sum + g.revisions.length, 0)

  return (
    <div>
      <p className="mb-4 text-sm text-slate-600">
        <span className="font-semibold text-slate-800">{groups.length}</span> field
        {groups.length === 1 ? '' : 's'} ·{' '}
        <span className="font-semibold text-slate-800">{revisionCount}</span> revision
        {revisionCount === 1 ? '' : 's'}
        {editSessionCount > 0 && (
          <>
            {' '}
            across{' '}
            <span className="font-semibold text-slate-800">{editSessionCount}</span> edit
            {editSessionCount === 1 ? '' : 's'}
          </>
        )}
      </p>

      <div className="relative space-y-3">
        <div className="absolute bottom-3 left-[11px] top-3 w-0.5 bg-green-200" aria-hidden />
        {groups.map((group, index) => (
          <div key={group.key} className="relative pl-8">
            <span
              className="absolute left-0 top-4 z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-green-700 shadow-sm"
              aria-hidden
            >
              <span className="h-2 w-2 rounded-full bg-white" />
            </span>
            <FieldGroupBranch group={group} defaultExpanded={index === 0} />
          </div>
        ))}
      </div>
    </div>
  )
}
