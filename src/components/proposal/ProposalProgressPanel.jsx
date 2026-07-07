import { useMemo, useState, Fragment } from 'react'
import DocLink from '../DocLink'
import { ROLE_LABELS } from '../../constants/sectors'
import { formatDate, formatDateTime, resolveFileUrl } from '../../utils/format'
import { formatProgressSource } from '../../utils/progressUpdates'
import ProposalProgressReportActions from '../proposals/ProposalProgressReportActions'

function ProgressStatusBadge({ status }) {
  const label = status || 'Recorded'
  return (
    <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
      {label}
    </span>
  )
}

function SourceBadge({ value }) {
  const text = formatProgressSource(value)
  const isMouSync = String(value).includes('mou') || text === 'MOU fields'
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${
        isMouSync
          ? 'bg-blue-50 text-blue-800 ring-blue-200'
          : 'bg-slate-100 text-slate-700 ring-slate-200'
      }`}
    >
      {text}
    </span>
  )
}

const COMMENTS_PREVIEW_MAX = 3

function shortCommentAuthor(name = '') {
  const base = String(name).split(',')[0].trim() || 'Unknown'
  return base.length > 16 ? `${base.slice(0, 14)}…` : base
}

function commentDetailTooltip(c) {
  const role = ROLE_LABELS[c.commented_by_role] || c.commented_by_role || ''
  const when = c.created_at ? formatDate(c.created_at) : ''
  return [c.commented_by_name || 'Unknown', role, when].filter(Boolean).join(' · ')
}

function CommentsCell({ text, commentsDetail = [] }) {
  if (!text && !commentsDetail.length) {
    return <span className="text-slate-400">—</span>
  }

  if (commentsDetail.length) {
    const visible = commentsDetail.slice(0, COMMENTS_PREVIEW_MAX)
    const extra = commentsDetail.length - visible.length
    const tooltip = commentsDetail
      .map((c) => `${c.comment} — ${commentDetailTooltip(c)}`)
      .join('\n')

    return (
      <div className="max-w-[220px]" title={tooltip}>
        <ul className="space-y-0.5 text-xs leading-snug">
          {visible.map((c) => (
            <li key={c.id || `${c.created_at}-${c.comment}`} className="flex min-w-0 items-baseline gap-1">
              <span className="shrink-0 text-[10px] text-slate-300" aria-hidden>
                •
              </span>
              <span className="min-w-0 truncate font-medium text-slate-800">{c.comment}</span>
              <span className="shrink-0 text-[10px] text-slate-400">
                · {shortCommentAuthor(c.commented_by_name)}
              </span>
            </li>
          ))}
        </ul>
        {extra > 0 && (
          <p className="mt-0.5 pl-2.5 text-[10px] font-medium text-green-800">+{extra} more</p>
        )}
      </div>
    )
  }

  const plainParts = String(text)
    .split(/\s*\|\s*/)
    .map((part) => part.trim())
    .filter(Boolean)

  if (plainParts.length > 1) {
    const visible = plainParts.slice(0, COMMENTS_PREVIEW_MAX)
    const extra = plainParts.length - visible.length

    return (
      <div className="max-w-[200px]" title={plainParts.join('\n')}>
        <ul className="space-y-0.5 text-xs leading-snug">
          {visible.map((part) => (
            <li key={part} className="flex min-w-0 items-baseline gap-1">
              <span className="shrink-0 text-[10px] text-slate-300" aria-hidden>
                •
              </span>
              <span className="min-w-0 truncate text-slate-700">{part}</span>
            </li>
          ))}
        </ul>
        {extra > 0 && (
          <p className="mt-0.5 pl-2.5 text-[10px] font-medium text-green-800">+{extra} more</p>
        )}
      </div>
    )
  }

  return (
    <span className="line-clamp-3 max-w-[200px] text-xs leading-snug text-slate-700" title={text}>
      {text}
    </span>
  )
}

function formatCellValue(key, value, { onOpenFile, title, update }) {
  if (key === 'comments') {
    return (
      <CommentsCell
        text={value}
        commentsDetail={update?.comments_detail || []}
      />
    )
  }

  if (value == null || value === '') return <span className="text-slate-400">—</span>

  if (key === 'status') {
    return <ProgressStatusBadge status={String(value)} />
  }

  if (key === 'source') {
    return <SourceBadge value={value} />
  }

  if (key === 'progress_date') {
    return <span className="whitespace-nowrap">{formatDate(value) || value}</span>
  }

  if (key === 'recorded_at') {
    return <span className="whitespace-nowrap">{formatDateTime(value)}</span>
  }

  if (key === 'description') {
    return <span className="whitespace-pre-wrap break-words">{String(value)}</span>
  }

  if (key === 'added_by_role') {
    return <span>{ROLE_LABELS[value] || value}</span>
  }

  return <span className="break-words">{String(value)}</span>
}

function RowActions({
  update,
  row,
  actionLoading,
  canComment = false,
  onEdit,
  onDelete,
  onComment,
  onRequestUnlock,
  onGrantUnlock,
}) {
  const flags = update || row
  const showLock = flags?.edit_locked
  const showComment = canComment && flags?.can_comment !== false

  return (
    <div className="flex flex-col items-end gap-1">
      {showLock && (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 ring-1 ring-amber-200">
          🔒 Locked
        </span>
      )}
      {flags?.unlock_requested && !flags?.can_grant_unlock && (
        <span className="text-[10px] text-slate-500">Waiting for unlock</span>
      )}
      <div className="flex flex-wrap justify-end gap-1">
        {flags?.can_edit && (
          <button
            type="button"
            disabled={actionLoading}
            onClick={() => onEdit?.(update)}
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Edit
          </button>
        )}
        {flags?.can_delete && (
          <button
            type="button"
            disabled={actionLoading}
            onClick={() => onDelete?.(update)}
            className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
          >
            Delete
          </button>
        )}
        {showComment && (
          <button
            type="button"
            disabled={actionLoading}
            onClick={() => onComment?.(update)}
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Comment
          </button>
        )}
        {flags?.can_request_unlock && (
          <button
            type="button"
            disabled={actionLoading}
            onClick={() => onRequestUnlock?.(update)}
            className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-50"
          >
            Request edit access
          </button>
        )}
        {flags?.can_grant_unlock && (
          <button
            type="button"
            disabled={actionLoading}
            onClick={() => onGrantUnlock?.(update)}
            className="rounded-md border border-green-700/30 bg-green-50 px-2 py-1 text-[11px] font-semibold text-green-900 hover:bg-green-100 disabled:opacity-50"
          >
            Grant edit access
          </button>
        )}
      </div>
    </div>
  )
}

function ProgressRowDetails({ update, onOpenFile, onRespondToPoke, showRespondToPoke }) {
  if (!update) return null

  const commentsDetail = update.comments_detail || []

  return (
    <div className="space-y-3 border-t border-slate-100 bg-slate-50/60 px-4 py-3 text-sm">
      {commentsDetail.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Comments</p>
          <ul className="mt-1 space-y-2">
            {commentsDetail.map((c) => (
              <li
                key={c.id || `${c.created_at}-${c.comment}`}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2"
              >
                <p className="text-sm text-slate-800">{c.comment}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {c.commented_by_name}
                  {c.commented_by_role && (
                    <>
                      {' '}
                      · {ROLE_LABELS[c.commented_by_role] || c.commented_by_role}
                    </>
                  )}
                  {c.created_at && <> · {formatDate(c.created_at)}</>}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {update.synced_fields?.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Synced fields
          </p>
          <ul className="mt-1 space-y-1 text-slate-700">
            {update.synced_fields.map((field, index) => (
              <li key={`${field.field}-${index}`}>
                <span className="font-medium">{field.label || field.field}:</span>{' '}
                {field.old_value || '—'} → {field.new_value || '—'}
              </li>
            ))}
          </ul>
        </div>
      )}

      {update.is_poke && update.poke_response && (
        <div className="rounded-lg border border-green-200 bg-green-50/60 p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-green-800">Party A response</p>
          <p className="mt-1 font-semibold text-slate-800">{update.poke_response.title}</p>
          {update.poke_response.description && (
            <p className="mt-1 whitespace-pre-wrap text-slate-600">
              {update.poke_response.description}
            </p>
          )}
          {update.poke_response.support_file_url && (
            <div className="mt-2">
              <DocLink
                url={update.poke_response.support_file_url}
                title="View response proof"
                onOpen={(url) =>
                  onOpenFile?.(resolveFileUrl(url), `Response — ${update.poke_response.title}`)
                }
              />
            </div>
          )}
        </div>
      )}

      {showRespondToPoke && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
          <p className="text-xs text-amber-900">Party A response needed for this update request.</p>
          <button
            type="button"
            onClick={onRespondToPoke}
            className="shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
          >
            Respond to Update Request
          </button>
        </div>
      )}
    </div>
  )
}

export default function ProposalProgressPanel({
  proposalId,
  proposalLabel,
  rows = [],
  columns = [],
  updates = [],
  count = 0,
  actionLoading = false,
  onOpenFile,
  isPartyA = false,
  onRespondToPoke,
  onEdit,
  onDelete,
  onComment,
  canComment = false,
  onRequestUnlock,
  onGrantUnlock,
  pokeActivityId = null,
}) {
  const [expandedId, setExpandedId] = useState(null)

  const updateById = useMemo(() => {
    const map = new Map()
    for (const update of updates) {
      if (update?.id != null) map.set(update.id, update)
    }
    return map
  }, [updates])

  const hasRowActions = useMemo(
    () =>
      rows.some((row) => {
        const u = updateById.get(row.id) || row
        return (
          u?.can_edit ||
          u?.can_delete ||
          u?.can_request_unlock ||
          u?.can_grant_unlock ||
          u?.edit_locked ||
          (canComment && u?.can_comment !== false)
        )
      }),
    [rows, updateById, canComment],
  )

  if (!rows.length) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <PanelHeader
          count={count}
          proposalId={proposalId}
          proposalLabel={proposalLabel}
          previewRows={rows}
          previewColumns={columns}
          previewUpdates={updates}
        />
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-14 text-center">
          <p className="text-3xl">📭</p>
          <p className="mt-3 font-semibold text-slate-700">No progress updates yet</p>
          <p className="mt-1 text-sm text-slate-500">
            Add a progress update or edit MOU progress fields to record changes here.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <PanelHeader
        count={count}
        proposalId={proposalId}
        proposalLabel={proposalLabel}
        previewRows={rows}
        previewColumns={columns}
        previewUpdates={updates}
      />
      <div className="overflow-x-auto px-2 pb-4 sm:px-4">
        <table className="min-w-[1040px] w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="w-8 px-2 py-3" aria-label="Expand" />
              {columns.map((col) => (
                <th key={col.key} className="whitespace-nowrap px-3 py-3 font-semibold">
                  {col.label}
                </th>
              ))}
              {hasRowActions && (
                <th className="whitespace-nowrap px-3 py-3 text-right font-semibold">Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, rowIndex) => {
              const rowId = row.id ?? rowIndex
              const update = updateById.get(row.id) || updates[rowIndex]
              const isExpanded = expandedId === rowId
              const showRespond =
                isPartyA &&
                update?.can_respond &&
                (pokeActivityId ? update.id === pokeActivityId : true)
              const commentsText =
                row.comments ??
                update?.comments_display ??
                update?.sheet_row?.comments ??
                ''

              return (
                <Fragment key={rowId}>
                  <tr className="hover:bg-slate-50/80">
                    <td className="px-2 py-2.5 align-top">
                      <button
                        type="button"
                        onClick={() => setExpandedId((prev) => (prev === rowId ? null : rowId))}
                        className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                        aria-expanded={isExpanded}
                      >
                        {isExpanded ? '▾' : '▸'}
                      </button>
                    </td>
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`px-3 py-2.5 align-top text-slate-700 ${
                          col.key === 'description'
                            ? 'max-w-[280px]'
                            : col.key === 'comments'
                              ? 'min-w-[180px] max-w-[240px]'
                              : ''
                        }`}
                      >
                        {formatCellValue(
                          col.key,
                          col.key === 'comments' ? commentsText : row[col.key],
                          { onOpenFile, title: row.title, update },
                        )}
                      </td>
                    ))}
                    {hasRowActions && (
                      <td className="px-3 py-2.5 align-top">
                        <RowActions
                          update={update}
                          row={row}
                          actionLoading={actionLoading}
                          canComment={canComment}
                          onEdit={onEdit}
                          onDelete={onDelete}
                          onComment={onComment}
                          onRequestUnlock={onRequestUnlock}
                          onGrantUnlock={onGrantUnlock}
                        />
                      </td>
                    )}
                  </tr>
                  {(isExpanded || showRespond) && (
                    <tr>
                      <td colSpan={columns.length + 1 + (hasRowActions ? 1 : 0)} className="p-0">
                        <ProgressRowDetails
                          update={update}
                          onOpenFile={onOpenFile}
                          showRespondToPoke={showRespond}
                          onRespondToPoke={() => onRespondToPoke?.(update?.id)}
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function PanelHeader({ count, proposalId, proposalLabel, previewRows, previewColumns, previewUpdates }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">Progress</h2>
        <p className="text-sm text-slate-500">Excel-style log of MOU progress and field syncs</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          {count} {count === 1 ? 'entry' : 'entries'}
        </span>
        {proposalId && (
          <ProposalProgressReportActions
            proposalId={proposalId}
            proposalLabel={proposalLabel}
            previewRows={previewRows}
            previewColumns={previewColumns}
            previewUpdates={previewUpdates}
          />
        )}
      </div>
    </div>
  )
}
