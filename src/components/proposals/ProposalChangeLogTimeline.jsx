import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import * as proposalsApi from '../../api/proposals'
import LoadingSpinner from '../LoadingSpinner'
import { ROLE_LABELS } from '../../constants/sectors'
import { formatDate, formatRelativeTime, getErrorMessage } from '../../utils/format'

const PAGE_SIZE = 50
const EMPTY_LIST_FILTERS = Object.freeze({})

function formatChangeValue(value) {
  if (value == null || value === '') {
    return <span className="text-slate-400">—</span>
  }
  return <span className="break-words text-slate-700">{String(value)}</span>
}

/** Ensure changes is always an array (guards legacy object-shaped payloads). */
function normalizeChanges(log) {
  const raw = log?.changes
  if (Array.isArray(raw)) return raw.filter(Boolean)
  if (raw && typeof raw === 'object') return Object.values(raw).filter(Boolean)
  return []
}

function proposalLinkLabel(log) {
  if (log.proposal_label) return log.proposal_label
  if (log.proposal_id) return `MOU #${log.proposal_id}`
  return null
}

function ChangeFieldsTable({ changes }) {
  return (
    <div className="mt-3 overflow-x-auto rounded-lg border border-slate-100">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="whitespace-nowrap px-3 py-2 font-semibold">Field</th>
            <th className="px-3 py-2 font-semibold">Before</th>
            <th className="w-8 px-1 py-2 text-center font-normal text-slate-400">→</th>
            <th className="px-3 py-2 font-semibold">After</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {changes.map((change, index) => (
            <tr key={`${change.field || change.label}-${index}`} className="bg-white">
              <td className="whitespace-nowrap px-3 py-2.5 font-medium text-slate-800">
                {change.label || change.field || '—'}
              </td>
              <td className="max-w-[220px] px-3 py-2.5 text-slate-600">
                {formatChangeValue(change.old_value)}
              </td>
              <td className="px-1 py-2.5 text-center text-slate-300">→</td>
              <td className="max-w-[220px] px-3 py-2.5 text-slate-600">
                {formatChangeValue(change.new_value)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ChangeDetailsList({ details }) {
  return (
    <ul className="mt-3 space-y-1.5 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2.5 text-sm text-slate-700">
      {details.map((line, index) => (
        <li key={index} className="flex gap-2">
          <span className="text-slate-400">•</span>
          <span>{line}</span>
        </li>
      ))}
    </ul>
  )
}

function ChangeLogEntry({ log, showProposalLink = false, defaultExpanded = false }) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const changes = normalizeChanges(log)
  const changeDetails = Array.isArray(log.change_details) ? log.change_details.filter(Boolean) : []
  const hasFieldChanges = changes.length > 0
  const hasDetails = hasFieldChanges || changeDetails.length > 0
  const fieldCount = hasFieldChanges ? changes.length : changeDetails.length
  const proposalLabel = proposalLinkLabel(log)

  const fieldPreview =
    log.fields_changed?.length > 0
      ? log.fields_changed.join(', ')
      : changes.map((c) => c.label || c.field).filter(Boolean).join(', ')

  return (
    <div className="relative pl-10 pb-5 last:pb-0">
      <span className="absolute left-0 top-1 z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-green-700 shadow-sm">
        <span className="h-2 w-2 rounded-full bg-white" />
      </span>
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {showProposalLink && proposalLabel && log.proposal_id && (
              <p className="mb-1 text-xs font-semibold text-portal-primary">
                <Link to={`/proposals/${log.proposal_id}?tab=history`} className="hover:underline">
                  {proposalLabel}
                </Link>
              </p>
            )}
            <p className="text-sm font-semibold text-slate-800">{log.changed_by_name || 'Unknown user'}</p>
            <p className="mt-0.5 text-xs text-slate-500">
              {ROLE_LABELS[log.changed_by_role] || log.changed_by_role || '—'}
              <span className="mx-1.5 text-slate-300">·</span>
              <span title={formatDate(log.created_at)}>{formatRelativeTime(log.created_at)}</span>
              <span className="mx-1.5 text-slate-300">·</span>
              {formatDate(log.created_at)}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
            {log.action_label || log.action || 'Change'}
          </span>
        </div>

        {log.summary && <p className="mt-2 text-sm text-slate-600">{log.summary}</p>}

        {hasDetails && (
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-portal-primary hover:underline"
            >
              <span
                className={`inline-block text-[10px] transition-transform ${expanded ? 'rotate-90' : ''}`}
                aria-hidden
              >
                ▶
              </span>
              {expanded
                ? 'Hide before / after'
                : `Show before / after${fieldCount ? ` (${fieldCount} field${fieldCount === 1 ? '' : 's'})` : ''}`}
              {!expanded && fieldPreview && (
                <span className="font-normal text-slate-500"> — {fieldPreview}</span>
              )}
            </button>

            {expanded &&
              (hasFieldChanges ? (
                <ChangeFieldsTable changes={changes} />
              ) : (
                <ChangeDetailsList details={changeDetails} />
              ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ViewerScopeBanner({ viewerScope }) {
  if (viewerScope !== 'own') return null
  return (
    <div className="mx-4 mb-2 mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900 sm:mx-6">
      Showing changes you made
    </div>
  )
}

export default function ProposalChangeLogTimeline({
  proposalId,
  source = 'proposal',
  listFilters = EMPTY_LIST_FILTERS,
  refreshKey = 0,
  enabled = true,
  emptyMessage,
}) {
  const [logs, setLogs] = useState([])
  const [total, setTotal] = useState(0)
  const [viewerScope, setViewerScope] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')

  const listFiltersKey = useMemo(() => JSON.stringify(listFilters), [listFilters])

  const showProposalLink = source === 'mine' || source === 'recent' || source === 'sector'

  const resolvedEmptyMessage =
    emptyMessage ||
    (source === 'mine'
      ? 'You have not recorded any MOU changes yet.'
      : source === 'recent' || source === 'sector'
        ? 'No changes match your filters.'
        : viewerScope === 'own'
          ? 'You have not made any changes to this MOU yet.'
          : 'No changes recorded yet. Changes are logged from deploy onward.')

  const load = useCallback(
    async ({ append = false, offset = 0 } = {}) => {
      if (!enabled) return
      if (source === 'proposal' && !proposalId) return

      if (append) setLoadingMore(true)
      else setLoading(true)
      setError('')
      try {
        let res
        if (source === 'mine') {
          res = await proposalsApi.getMyChangeLogs({ limit: PAGE_SIZE, offset })
        } else if (source === 'recent') {
          res = await proposalsApi.getRecentChangeLogs({ ...listFilters, limit: PAGE_SIZE, offset })
        } else if (source === 'sector') {
          res = await proposalsApi.getSectorChangeLogs({ ...listFilters, limit: PAGE_SIZE, offset })
        } else {
          res = await proposalsApi.getProposalChangeLogs(proposalId, { limit: PAGE_SIZE, offset })
        }

        const nextLogs = Array.isArray(res?.logs) ? res.logs : []
        setViewerScope(
          res?.viewer_scope ||
            (source === 'mine' || listFilters.mine_only ? 'own' : source === 'recent' ? 'all' : null),
        )
        setTotal(typeof res?.total === 'number' ? res.total : nextLogs.length)
        setLogs((prev) => (append ? [...prev, ...nextLogs] : nextLogs))
      } catch (err) {
        setError(getErrorMessage(err))
        if (!append) {
          setLogs([])
          setTotal(0)
          setViewerScope(null)
        }
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [proposalId, enabled, source, listFiltersKey],
  )

  useEffect(() => {
    if (!enabled) {
      setLogs([])
      setTotal(0)
      setViewerScope(null)
      return
    }
    if (source === 'proposal' && !proposalId) {
      setLogs([])
      setTotal(0)
      setViewerScope(null)
      return
    }
    load()
  }, [proposalId, enabled, refreshKey, load, source, listFiltersKey])

  if (source === 'proposal' && !proposalId) {
    return (
      <div className="py-16 text-center text-sm text-slate-500">
        Select an MOU to view its change history.
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-4 my-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 sm:mx-6">
        {error}
      </div>
    )
  }

  if (!logs.length) {
    return (
      <div>
        <ViewerScopeBanner viewerScope={viewerScope} />
        <div className="py-16 text-center text-sm text-slate-500">{resolvedEmptyMessage}</div>
      </div>
    )
  }

  const hasMore = logs.length < total

  return (
    <div className="px-2 py-4 sm:px-4">
      <ViewerScopeBanner viewerScope={viewerScope} />
      <div className="mb-4 flex items-center justify-between gap-2">
        <p className="text-sm text-slate-600">
          <span className="font-semibold text-slate-800">{total}</span> change
          {total === 1 ? '' : 's'} recorded
        </p>
      </div>
      <div className="relative">
        <div className="absolute bottom-2 left-[11px] top-2 w-0.5 bg-green-200" />
        {logs.map((log) => (
          <ChangeLogEntry key={log.id} log={log} showProposalLink={showProposalLink} />
        ))}
      </div>
      {hasMore && (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            disabled={loadingMore}
            onClick={() => load({ append: true, offset: logs.length })}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {loadingMore ? 'Loading…' : `Load more (${logs.length} of ${total})`}
          </button>
        </div>
      )}
    </div>
  )
}
