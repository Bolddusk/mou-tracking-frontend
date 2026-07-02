import { useCallback, useEffect, useMemo, useState } from 'react'
import * as adminRbacApi from '../../api/adminRbac'
import Alert from '../../components/Alert'
import PermissionNavBundle from '../../components/admin/PermissionNavBundle'
import LoadingSpinner from '../../components/LoadingSpinner'
import UserRoleBadge from '../../components/UserRoleBadge'
import {
  SIDEBAR_PERMISSION_TOTAL,
  SIDEBAR_PRIMARY_KEYS,
} from '../../constants/sidebarPermissions'
import { useAuth } from '../../context/AuthContext'
import { ROLE_LABELS } from '../../constants/sectors'
import {
  allSidebarAliasKeys,
  buildSidebarNavigation,
  flattenNavigation,
  getNavGrantKeys,
  isPermissionGranted,
  parseAdminRolesList,
} from '../../utils/rbac'
import {
  applyNavGrant,
  applyNavRevoke,
  buildNavSectionsFromBundles,
  bundleByNavKey,
  collectAllBundlePermissionKeys,
  collectBundlePermissionKeys,
  filterCanonicalBundles,
  isCanonicalNavKey,
  OBSOLETE_NAV_KEYS,
} from '../../utils/permissionBundles'
import { getErrorMessage } from '../../utils/format'

const SIDEBAR_ALIAS_KEYS = allSidebarAliasKeys(SIDEBAR_PRIMARY_KEYS)

function countSidebarGranted(grantedSet, navSections) {
  let n = 0
  for (const section of navSections) {
    for (const perm of section.permissions) {
      if (isPermissionGranted(grantedSet, perm.key)) n += 1
    }
  }
  return n
}

function buildPutPayload(grantedSet, draftGranted, uiKeys) {
  const preserved = Array.from(grantedSet).filter((key) => !uiKeys.has(key))
  const draft = Array.from(draftGranted).filter((key) => !OBSOLETE_NAV_KEYS.has(key))
  return [...new Set([...preserved, ...draft])].sort()
}

function permissionSet(list = []) {
  return new Set(Array.isArray(list) ? list : [])
}

export default function PermissionsAdmin() {
  const { rbac: currentRbac, refreshPermissions, can } = useAuth()
  const [catalogLabels, setCatalogLabels] = useState({})
  const [roles, setRoles] = useState([])
  const [selectedRole, setSelectedRole] = useState(null)
  const [roleDetail, setRoleDetail] = useState(null)
  const [granted, setGranted] = useState(() => new Set())
  const [draftGranted, setDraftGranted] = useState(() => new Set())
  const [loading, setLoading] = useState(true)
  const [roleLoading, setRoleLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [togglingKey, setTogglingKey] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [tab, setTab] = useState('permissions')
  const [saveMode, setSaveMode] = useState('patch')
  const [bundles, setBundles] = useState([])
  const [expandedNav, setExpandedNav] = useState(() => new Set())
  const [grantModal, setGrantModal] = useState(null)

  const bundleMap = useMemo(() => bundleByNavKey(filterCanonicalBundles(bundles)), [bundles])

  const navSections = useMemo(
    () => buildNavSectionsFromBundles(bundles),
    [bundles],
  )

  const navKeyTotal = useMemo(() => {
    const fromApi = filterCanonicalBundles(bundles).length
    return fromApi > 0 ? fromApi : SIDEBAR_PERMISSION_TOTAL
  }, [bundles])

  const uiPermissionKeys = useMemo(() => {
    const keys = new Set(SIDEBAR_ALIAS_KEYS)
    for (const key of collectAllBundlePermissionKeys(bundles)) keys.add(key)
    return keys
  }, [bundles])

  const loadCatalogAndRoles = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [catalogData, rolesData, bundlesData] = await Promise.all([
        adminRbacApi.getAdminPermissionCatalog(),
        adminRbacApi.getAdminRoles(),
        adminRbacApi.getPermissionBundles().catch(() => ({ bundles: [] })),
      ])
      const labels = {}
      const groups = catalogData?.groups || []
      for (const group of groups) {
        for (const perm of group.permissions || []) {
          const key = typeof perm === 'string' ? perm : perm.key
          if (key) {
            labels[key] = typeof perm === 'string' ? perm : perm.label || key
          }
        }
      }
      for (const entry of catalogData?.permissions || catalogData?.permission_catalog || []) {
        const key = entry.key || entry
        if (key && !labels[key]) labels[key] = entry.label || key
      }
      setCatalogLabels(labels)
      setBundles(Array.isArray(bundlesData?.bundles) ? filterCanonicalBundles(bundlesData.bundles) : [])
      const roleList = parseAdminRolesList(rolesData)
      setRoles(roleList)
      setSelectedRole((prev) => prev || roleList[0]?.value || roleList[0]?.role || null)
    } catch (err) {
      setError(getErrorMessage(err))
      setCatalogLabels({})
      setRoles([])
    } finally {
      setLoading(false)
    }
  }, [])

  const loadRoleDetail = useCallback(async (role) => {
    if (!role) return
    setRoleLoading(true)
    setError('')
    try {
      const data = await adminRbacApi.getAdminRole(role)
      const perms = permissionSet(data.permissions)
      setRoleDetail(data)
      setGranted(perms)
      setDraftGranted(new Set(perms))
    } catch (err) {
      setError(getErrorMessage(err))
      setRoleDetail(null)
      setGranted(new Set())
      setDraftGranted(new Set())
    } finally {
      setRoleLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCatalogAndRoles()
  }, [loadCatalogAndRoles])

  useEffect(() => {
    if (selectedRole) loadRoleDetail(selectedRole)
  }, [selectedRole, loadRoleDetail])

  const sidebarSections = useMemo(
    () =>
      navSections.map((section) => ({
        ...section,
        permissions: section.permissions.map((perm) => ({
          ...perm,
          label: catalogLabels[perm.key] || perm.label,
        })),
      })),
    [navSections, catalogLabels],
  )

  const draftSidebarCount = useMemo(
    () => countSidebarGranted(draftGranted, sidebarSections),
    [draftGranted, sidebarSections],
  )

  const previewNavigation = useMemo(
    () =>
      buildSidebarNavigation({
        role: selectedRole,
        permissions: Array.from(draftGranted),
      }),
    [selectedRole, draftGranted],
  )

  const activeRoleMeta = useMemo(() => {
    const fromList = roles.find((r) => (r.value || r.role) === selectedRole)
    if (fromList) return fromList
    if (roleDetail) return roleDetail
    return null
  }, [roles, selectedRole, roleDetail])

  const isDirty = useMemo(() => {
    if (granted.size !== draftGranted.size) return true
    for (const key of granted) {
      if (!draftGranted.has(key)) return true
    }
    return false
  }, [granted, draftGranted])

  const syncRoleFromResponse = (data) => {
    const perms = permissionSet(data?.permissions)
    setRoleDetail((prev) => ({ ...prev, ...data }))
    setGranted(perms)
    setDraftGranted(new Set(perms))
    setRoles((prev) =>
      prev.map((r) => {
        const id = r.value || r.role
        if (id !== (data?.value || data?.role || selectedRole)) return r
        return { ...r, permissions: data.permissions, navigation: data.navigation }
      }),
    )
  }

  const handleToggleExpand = (navKey) => {
    setExpandedNav((prev) => {
      const next = new Set(prev)
      if (next.has(navKey)) next.delete(navKey)
      else next.add(navKey)
      return next
    })
  }

  const applyNavRevokeDraft = (navKey) => {
    const bundle = bundleMap.get(navKey)
    setDraftGranted((prev) => {
      const next = applyNavRevoke(prev, navKey, bundle)
      for (const alias of getNavGrantKeys(navKey)) next.delete(alias)
      return next
    })
  }

  const runNavRevoke = async (navKey) => {
    const bundle = bundleMap.get(navKey)
    const revokeKeys = [
      ...getNavGrantKeys(navKey),
      ...collectBundlePermissionKeys(bundle),
    ]
    const uniqueRevoke = [...new Set(revokeKeys)].filter(
      (key) => !key.startsWith('nav.') || isCanonicalNavKey(key),
    )
    const res = await adminRbacApi.patchAdminRolePermissions(selectedRole, {
      revoke: uniqueRevoke.length ? uniqueRevoke : [navKey],
    })
    syncRoleFromResponse(res)
    setSuccess(`Revoked ${navKey} and sub-permissions`)
  }

  const runNavGrant = async (navKey, level) => {
    if (level === 'full') {
      await adminRbacApi.grantRoleBundle(selectedRole, { nav_key: navKey, level: 'full' })
    } else {
      await adminRbacApi.patchAdminRolePermissions(selectedRole, { grant: [navKey] })
    }
    const data = await adminRbacApi.getAdminRole(selectedRole)
    syncRoleFromResponse(data)
    setExpandedNav((prev) => new Set(prev).add(navKey))
    setSuccess(
      level === 'full'
        ? `Granted ${navKey} with full page access`
        : `Granted ${navKey} with minimum sub-permissions`,
    )
  }

  const handleNavToggle = async (navKey, checked) => {
    if (!selectedRole) return

    if (checked) {
      if (saveMode === 'patch') {
        const perm = sidebarSections.flatMap((s) => s.permissions).find((p) => p.key === navKey)
        setGrantModal({
          navKey,
          label: perm?.label || navKey,
        })
        return
      }
      const bundle = bundleMap.get(navKey)
      setDraftGranted((prev) => {
        const next = applyNavGrant(prev, navKey, bundle, 'minimum')
        for (const alias of getNavGrantKeys(navKey)) next.add(alias)
        return next
      })
      setExpandedNav((prev) => new Set(prev).add(navKey))
      return
    }

    if (saveMode !== 'patch') {
      applyNavRevokeDraft(navKey)
      return
    }

    setTogglingKey(navKey)
    setError('')
    setSuccess('')
    const prevDraft = new Set(draftGranted)
    applyNavRevokeDraft(navKey)

    try {
      await runNavRevoke(navKey)
    } catch (err) {
      setDraftGranted(prevDraft)
      setError(getErrorMessage(err))
    } finally {
      setTogglingKey(null)
    }
  }

  const handleGrantModalConfirm = async (level) => {
    if (!grantModal || !selectedRole) return
    const { navKey } = grantModal
    setGrantModal(null)
    setTogglingKey(navKey)
    setError('')
    setSuccess('')
    const prevDraft = new Set(draftGranted)
    const bundle = bundleMap.get(navKey)
    setDraftGranted((prev) => {
      const next = applyNavGrant(prev, navKey, bundle, level)
      for (const alias of getNavGrantKeys(navKey)) next.add(alias)
      return next
    })

    try {
      await runNavGrant(navKey, level)
    } catch (err) {
      setDraftGranted(prevDraft)
      setError(getErrorMessage(err))
    } finally {
      setTogglingKey(null)
    }
  }

  const handleActionToggle = async (key, checked) => {
    if (!selectedRole) return

    if (saveMode !== 'patch') {
      setDraftGranted((prev) => {
        const next = new Set(prev)
        if (checked) next.add(key)
        else next.delete(key)
        return next
      })
      return
    }

    setTogglingKey(key)
    setError('')
    setSuccess('')
    const prevDraft = new Set(draftGranted)
    setDraftGranted((prev) => {
      const next = new Set(prev)
      if (checked) next.add(key)
      else next.delete(key)
      return next
    })

    try {
      const res = await adminRbacApi.patchAdminRolePermissions(
        selectedRole,
        checked ? { grant: [key] } : { revoke: [key] },
      )
      syncRoleFromResponse(res)
      setSuccess(checked ? `Granted ${key}` : `Revoked ${key}`)
    } catch (err) {
      setDraftGranted(prevDraft)
      setError(getErrorMessage(err))
    } finally {
      setTogglingKey(null)
    }
  }

  const handleSaveAll = async () => {
    if (!selectedRole) return
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const payload = buildPutPayload(granted, draftGranted, uiPermissionKeys)
      const res = await adminRbacApi.putAdminRolePermissions(selectedRole, payload)
      syncRoleFromResponse(res)
      setSuccess(
        `Saved ${countSidebarGranted(draftGranted)} sidebar permissions for ${activeRoleMeta?.label || selectedRole}`,
      )
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const handleDiscard = () => {
    setDraftGranted(new Set(granted))
    setSuccess('')
    setError('')
  }

  const handleRefreshMyRbac = async () => {
    setSuccess('')
    setError('')
    try {
      await refreshPermissions()
      setSuccess('Your session permissions refreshed from server.')
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!can('nav.permissions.manage')) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-slate-600">You do not have permission to manage role permissions.</p>
      </div>
    )
  }

  const roleLabel =
    activeRoleMeta?.label ||
    roleDetail?.label ||
    ROLE_LABELS[selectedRole] ||
    selectedRole

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Role Permissions</h1>
          <p className="mt-1 text-sm text-slate-500">
            {navKeyTotal} main page permissions — expand each to manage sub-permissions
            (APIs &amp; actions). Role list shows main heads only. Users refresh via login or{' '}
            <code className="text-xs">GET /api/auth/me</code>.
          </p>
        </div>
        <button
          type="button"
          onClick={handleRefreshMyRbac}
          className="shrink-0 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Refresh my session
        </button>
      </div>

      <Alert type="error" message={error} onClose={() => setError('')} />
      <Alert type="success" message={success} onClose={() => setSuccess('')} />

      {currentRbac && (
        <section className="rounded-xl border border-green-200 bg-green-50/60 px-4 py-3 text-sm text-green-900">
          <span className="font-semibold">Your role:</span>{' '}
          {currentRbac.role_label || ROLE_LABELS[currentRbac.role] || currentRbac.role}
          {' · '}
          <span className="font-semibold">{currentRbac.permissions?.length ?? 0}</span> permissions
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Roles ({roles.length})
          </p>
          <div className="space-y-1">
            {roles.map((role) => {
              const id = role.value || role.role
              const count = countSidebarGranted(role.permissions || [], navSections)
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSelectedRole(id)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                    selectedRole === id
                      ? 'bg-portal-primary/10 font-semibold text-green-900'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>{role.label || ROLE_LABELS[id] || id}</span>
                  <span className="text-xs text-slate-400">{count}</span>
                </button>
              )
            })}
          </div>
        </aside>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          {selectedRole ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
                <div className="flex items-center gap-3">
                  <UserRoleBadge role={selectedRole} />
                  <div>
                    <h2 className="text-lg font-semibold text-slate-800">{roleLabel}</h2>
                    <p className="text-xs text-slate-500">
                      {draftSidebarCount} of {navKeyTotal} main pages enabled
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex rounded-lg border border-slate-200 p-0.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setSaveMode('patch')}
                      className={`rounded-md px-2.5 py-1 font-medium ${
                        saveMode === 'patch'
                          ? 'bg-slate-100 text-slate-900'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                      title="Each checkbox saves immediately via PATCH"
                    >
                      Auto-save
                    </button>
                    <button
                      type="button"
                      onClick={() => setSaveMode('put')}
                      className={`rounded-md px-2.5 py-1 font-medium ${
                        saveMode === 'put'
                          ? 'bg-slate-100 text-slate-900'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                      title="Edit multiple, then Save all via PUT"
                    >
                      Batch edit
                    </button>
                  </div>
                  <div className="flex rounded-lg border border-slate-200 p-0.5 text-sm">
                    <button
                      type="button"
                      onClick={() => setTab('permissions')}
                      className={`rounded-md px-3 py-1.5 font-medium ${
                        tab === 'permissions'
                          ? 'bg-slate-100 text-slate-900'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      Permissions
                    </button>
                    <button
                      type="button"
                      onClick={() => setTab('navigation')}
                      className={`rounded-md px-3 py-1.5 font-medium ${
                        tab === 'navigation'
                          ? 'bg-slate-100 text-slate-900'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      Sidebar
                    </button>
                  </div>
                </div>
              </div>

              {(saveMode === 'put' && isDirty) || saving ? (
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-100 bg-amber-50/80 px-6 py-3">
                  <p className="text-sm text-amber-900">
                    {saveMode === 'put' && isDirty
                      ? 'Unsaved changes — use Save all to apply the full permission set.'
                      : 'Saving…'}
                  </p>
                  <div className="flex gap-2">
                    {isDirty && (
                      <button
                        type="button"
                        onClick={handleDiscard}
                        disabled={saving}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                      >
                        Discard
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleSaveAll}
                      disabled={saving || !isDirty}
                      className="inline-flex items-center gap-2 rounded-lg bg-portal-primary px-4 py-1.5 text-sm font-semibold text-white hover:bg-portal-primary-hover disabled:opacity-50"
                    >
                      {saving && <LoadingSpinner size="sm" />}
                      Save all
                    </button>
                  </div>
                </div>
              ) : null}

              {roleLoading ? (
                <div className="flex justify-center py-16">
                  <LoadingSpinner size="lg" />
                </div>
              ) : tab === 'permissions' ? (
                <div className="space-y-6 p-6">
                  {sidebarSections.map((group) => (
                    <div key={group.section}>
                      <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                        {group.section}
                      </h3>
                      <div className="space-y-2">
                        {group.permissions.map((perm) => (
                          <PermissionNavBundle
                            key={perm.key}
                            perm={perm}
                            bundle={bundleMap.get(perm.key)}
                            expanded={expandedNav.has(perm.key)}
                            onToggleExpand={handleToggleExpand}
                            draftGranted={draftGranted}
                            catalogLabels={catalogLabels}
                            busy={togglingKey}
                            saving={saving}
                            onNavToggle={handleNavToggle}
                            onActionToggle={handleActionToggle}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-6 p-6">
                  {previewNavigation.map((section) => (
                    <div key={section.section}>
                      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                        {section.section}
                      </p>
                      <div className="overflow-x-auto rounded-lg border border-slate-200">
                        <table className="min-w-full text-left text-sm">
                          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                            <tr>
                              <th className="px-4 py-2 font-semibold">Label</th>
                              <th className="px-4 py-2 font-semibold">Path</th>
                              <th className="px-4 py-2 font-semibold">Permission</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {(section.items || []).map((item) => (
                              <tr key={item.key} className="hover:bg-slate-50/80">
                                <td className="px-4 py-2 font-medium text-slate-800">
                                  {item.label}
                                </td>
                                <td className="px-4 py-2 font-mono text-xs text-slate-600">
                                  {item.path}
                                </td>
                                <td className="px-4 py-2 font-mono text-xs text-slate-500">
                                  {item.permission || '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                  {!previewNavigation.length && (
                    <p className="text-sm text-slate-500">
                      Sidebar preview updates when permissions change — reload role to see navigation.
                    </p>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="p-10 text-center text-slate-500">Select a role to edit permissions.</div>
          )}
        </div>
      </div>

      {grantModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
            role="dialog"
            aria-labelledby="grant-bundle-title"
          >
            <h3 id="grant-bundle-title" className="text-lg font-semibold text-slate-900">
              Grant sub-permissions?
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              <span className="font-medium">{grantModal.label}</span> needs API permissions to work
              on that page. Choose what to grant:
            </p>
            <div className="mt-5 space-y-2">
              <button
                type="button"
                onClick={() => handleGrantModalConfirm('minimum')}
                className="w-full rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-left text-sm hover:bg-green-100/80"
              >
                <span className="font-semibold text-green-900">Minimum (recommended)</span>
                <span className="mt-0.5 block text-xs text-green-800">
                  View list + open detail — fixes 403 on MOU open
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleGrantModalConfirm('full')}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm hover:bg-slate-100"
              >
                <span className="font-semibold text-slate-900">Full page access</span>
                <span className="mt-0.5 block text-xs text-slate-600">
                  All APIs and actions for this page
                </span>
              </button>
            </div>
            <button
              type="button"
              onClick={() => setGrantModal(null)}
              className="mt-4 w-full rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {currentRbac && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800">Your live sidebar</h2>
          <p className="mt-1 text-sm text-slate-500">From your current session — not the role being edited.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {buildSidebarNavigation(currentRbac).map((section) => (
              <div
                key={section.section}
                className="rounded-xl border border-slate-100 bg-slate-50/50 p-4"
              >
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  {section.section}
                </p>
                <ul className="mt-2 space-y-1 text-sm text-slate-700">
                  {(section.items || []).map((item) => (
                    <li key={item.key}>• {item.label}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-400">
            {flattenNavigation(buildSidebarNavigation(currentRbac)).length} nav items
          </p>
        </section>
      )}
    </div>
  )
}
