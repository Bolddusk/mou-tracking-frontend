import { useCallback, useEffect, useState } from 'react'
import * as mmApi from '../../api/matchmaking'
import * as proposalsApi from '../../api/proposals'
import Modal from '../Modal'
import LoadingSpinner from '../LoadingSpinner'
import { formatDate, getErrorMessage, resolveFileUrl } from '../../utils/format'

function resolveIsCurrent(version, currentVersion) {
  if (version.is_current === true) return true
  if (version.is_current === false) return false
  if (currentVersion != null) return version.version_number === currentVersion
  return false
}

export function MouVersionsTable({ versions, currentVersion, showStatusColumn = true }) {
  if (!versions?.length) return null

  const resolvedCurrent =
    currentVersion ??
    versions.find((v) => v.is_current)?.version_number ??
    versions[0]?.version_number

  return (
    <div className="overflow-x-auto">
      <table className="min-w-[560px] w-full text-left text-sm">
        <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
          <tr>
            <th className="px-3 py-2 font-semibold">Version</th>
            <th className="px-3 py-2 font-semibold">File</th>
            <th className="px-3 py-2 font-semibold">Uploaded by</th>
            <th className="px-3 py-2 font-semibold">Date</th>
            {showStatusColumn && <th className="px-3 py-2 font-semibold">Status</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {versions.map((v) => {
            const isCurrent = resolveIsCurrent(v, resolvedCurrent)
            return (
              <tr
                key={v.id ?? `v${v.version_number}`}
                className={isCurrent ? 'bg-green-50/70' : 'hover:bg-slate-50/80'}
              >
                <td className="px-3 py-3 font-semibold text-slate-800">v{v.version_number}</td>
                <td className="px-3 py-3">
                  <a
                    href={resolveFileUrl(v.file_url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-portal-primary hover:underline"
                  >
                    Download
                  </a>
                </td>
                <td className="px-3 py-3 text-slate-700">{v.uploaded_by_name || '—'}</td>
                <td className="whitespace-nowrap px-3 py-3 text-slate-600">
                  {formatDate(v.uploaded_at)}
                </td>
                {showStatusColumn && (
                  <td className="px-3 py-3">
                    {isCurrent ? (
                      <span className="inline-flex rounded-full bg-portal-primary px-2.5 py-0.5 text-[10px] font-bold text-white">
                        Current
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold text-slate-600">
                        History
                      </span>
                    )}
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function MouVersionBadge({ version }) {
  if (!version) return null
  return (
    <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-700 ring-1 ring-slate-200">
      v{version}
    </span>
  )
}

/**
 * @param {{ entityType: 'proposal' | 'match', entityId: number|string, open: boolean, onClose: () => void, currentVersion?: number|null, versions?: array|null }} props
 */
export default function MouVersionHistory({
  entityType,
  entityId,
  open,
  onClose,
  currentVersion,
  versions: versionsProp,
}) {
  const [versions, setVersions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!entityId) return
    setLoading(true)
    setError('')
    try {
      const data =
        entityType === 'proposal'
          ? await proposalsApi.getProposalMouVersions(entityId)
          : await mmApi.getMatchMouVersions(entityId)
      setVersions(Array.isArray(data.versions) ? data.versions : [])
    } catch (err) {
      setError(getErrorMessage(err))
      setVersions([])
    } finally {
      setLoading(false)
    }
  }, [entityType, entityId])

  useEffect(() => {
    if (!open) return
    if (versionsProp?.length) {
      setVersions(versionsProp)
      setLoading(false)
      setError('')
      return
    }
    load()
  }, [open, load, versionsProp])

  const displayVersions = versionsProp?.length ? versionsProp : versions

  return (
    <Modal open={open} title="MOU Version History" onClose={onClose} hideFooter>
      {loading ? (
        <div className="flex justify-center py-10">
          <LoadingSpinner />
        </div>
      ) : error ? (
        <p className="text-sm text-red-700">{error}</p>
      ) : displayVersions.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-500">No file versions uploaded yet.</p>
      ) : (
        <MouVersionsTable versions={displayVersions} currentVersion={currentVersion} />
      )}
      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Close
        </button>
      </div>
    </Modal>
  )
}
