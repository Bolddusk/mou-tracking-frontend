import LoadingSpinner from '../LoadingSpinner'
import { bundleSubGroups } from '../../utils/permissionBundles'
import { isPermissionGranted } from '../../utils/rbac'

function SubItemLabel({ item, catalogLabels }) {
  const key = item.permission
  const label =
    item.label ||
    catalogLabels[key] ||
    (item.method && item.path ? `${item.method} ${item.path}` : key)
  return (
    <>
      <span className="block text-sm text-slate-800">{label}</span>
      <span className="block font-mono text-[11px] text-slate-500">{key}</span>
    </>
  )
}

export default function PermissionNavBundle({
  perm,
  bundle,
  expanded,
  onToggleExpand,
  draftGranted,
  catalogLabels,
  busy,
  saving,
  onNavToggle,
  onActionToggle,
}) {
  const navChecked = isPermissionGranted(draftGranted, perm.key)
  const subGroups = bundleSubGroups(bundle)
  const subCount = subGroups.reduce((n, g) => n + g.items.length, 0)

  return (
    <div
      className={`rounded-xl border transition-colors ${
        navChecked ? 'border-green-200 bg-green-50/40' : 'border-slate-200 bg-white'
      }`}
    >
      <div className="flex items-start gap-2 px-3 py-2.5">
        <button
          type="button"
          onClick={() => onToggleExpand(perm.key)}
          className="mt-1 shrink-0 rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-expanded={expanded}
          aria-label={expanded ? 'Collapse sub-permissions' : 'Expand sub-permissions'}
        >
          <svg
            className={`h-4 w-4 transition-transform ${expanded ? 'rotate-90' : ''}`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M7.21 14.77a.75.75 0 01.02-1.06L10.94 10 7.23 6.29a.75.75 0 111.06-1.06l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06 0z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        <label
          className={`flex min-w-0 flex-1 cursor-pointer items-start gap-3 ${busy ? 'opacity-60' : ''}`}
        >
          <input
            type="checkbox"
            checked={navChecked}
            disabled={busy || saving}
            onChange={(e) => onNavToggle(perm.key, e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-portal-primary focus:ring-portal-primary/30"
          />
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-slate-800">
                {perm.label || perm.key}
              </span>
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
                Main
              </span>
              {subCount > 0 && (
                <span className="text-[11px] text-slate-400">{subCount} sub</span>
              )}
            </span>
            <span className="block font-mono text-[11px] text-slate-500">{perm.key}</span>
          </span>
        </label>

        {busy && <LoadingSpinner size="sm" />}
      </div>

      {expanded && bundle && subGroups.length > 0 && (
        <div className="border-t border-slate-100 bg-white/80 px-3 py-3 pl-9">
          {subGroups.map((group) => (
            <div key={group.id} className="mb-4 last:mb-0">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                {group.label}
              </p>
              <div className="space-y-1.5">
                {group.items.map((item) => {
                  const key = item.permission
                  if (!key) return null
                  const checked = draftGranted.has(key)
                  const itemBusy = busy === key
                  return (
                    <label
                      key={key}
                      className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2 ${
                        checked
                          ? 'border-green-100 bg-green-50/50'
                          : 'border-slate-100 bg-slate-50/50 hover:bg-slate-50'
                      } ${itemBusy ? 'opacity-60' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={itemBusy || saving || !navChecked}
                        onChange={(e) => onActionToggle(key, e.target.checked)}
                        className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-portal-primary focus:ring-portal-primary/30 disabled:opacity-40"
                        title={!navChecked ? 'Enable main permission first' : undefined}
                      />
                      <span className="min-w-0 flex-1">
                        <SubItemLabel item={item} catalogLabels={catalogLabels} />
                        {item.required && (
                          <span className="mt-1 inline-block rounded bg-amber-100 px-1 py-0.5 text-[10px] font-medium text-amber-800">
                            required
                          </span>
                        )}
                      </span>
                      {itemBusy && <LoadingSpinner size="sm" />}
                    </label>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {expanded && !bundle && (
        <p className="border-t border-slate-100 px-3 py-3 pl-9 text-xs text-slate-400">
          No sub-permissions loaded for this page yet.
        </p>
      )}
    </div>
  )
}
