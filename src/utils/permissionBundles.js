/**
 * Helpers for GET /api/admin/rbac/permission-bundles (15 nav heads → action sub-permissions).
 */

import {
  SIDEBAR_PERMISSION_SECTIONS,
  SIDEBAR_PRIMARY_KEYS,
} from '../constants/sidebarPermissions'

/** Obsolete nav keys — never show in permissions UI or send on grant/revoke. */
export const OBSOLETE_NAV_KEYS = new Set([
  'nav.proposals.my',
  'nav.proposals.party_b',
  'nav.mous.all',
  'nav.mous.sector',
  'nav.matchmaking.all_proposals',
  'nav.matchmaking.matches',
  'nav.profiles.party_a',
  'nav.profiles.party_b',
  'nav.profile.party_a',
  'nav.profile.party_b',
])

export const CANONICAL_NAV_KEY_SET = new Set(SIDEBAR_PRIMARY_KEYS)

export function isCanonicalNavKey(key) {
  return CANONICAL_NAV_KEY_SET.has(key) && !OBSOLETE_NAV_KEYS.has(key)
}

export function filterCanonicalBundles(bundles = []) {
  return bundles.filter((b) => isCanonicalNavKey(b?.nav_key))
}

export function bundleByNavKey(bundles = []) {
  const map = new Map()
  for (const bundle of bundles) {
    if (bundle?.nav_key) map.set(bundle.nav_key, bundle)
  }
  return map
}

export function collectBundlePermissionKeys(bundle) {
  const keys = new Set()
  if (!bundle) return keys
  for (const api of [
    ...(bundle.list_apis || []),
    ...(bundle.detail_apis || []),
    ...(bundle.actions || []),
  ]) {
    if (api?.permission) keys.add(api.permission)
  }
  return keys
}

export function collectAllBundlePermissionKeys(bundles = []) {
  const keys = new Set()
  for (const bundle of bundles) {
    for (const key of collectBundlePermissionKeys(bundle)) keys.add(key)
  }
  return keys
}

export function getMinimumGrant(bundle) {
  const min = bundle?.default_grant_on_nav?.minimum
  return Array.isArray(min) ? min : []
}

export function getFullGrant(bundle) {
  if (Array.isArray(bundle?.full_grant_on_nav) && bundle.full_grant_on_nav.length) {
    return bundle.full_grant_on_nav
  }
  return Array.from(collectBundlePermissionKeys(bundle))
}

export function bundleSubGroups(bundle) {
  if (!bundle) return []
  const keep = (item) => {
    const key = item?.permission
    if (!key) return true
    if (key.startsWith('nav.') && OBSOLETE_NAV_KEYS.has(key)) return false
    if (key.startsWith('nav.') && key !== bundle.nav_key) return false
    return true
  }
  const groups = []
  if (bundle.list_apis?.length) {
    groups.push({ id: 'list', label: 'List APIs', items: bundle.list_apis.filter(keep) })
  }
  if (bundle.detail_apis?.length) {
    groups.push({ id: 'detail', label: 'Detail APIs', items: bundle.detail_apis.filter(keep) })
  }
  if (bundle.actions?.length) {
    groups.push({ id: 'actions', label: 'Actions', items: bundle.actions.filter(keep) })
  }
  return groups.filter((g) => g.items.length > 0)
}

export function applyNavGrant(draft, navKey, bundle, level = 'minimum') {
  const next = new Set(draft)
  next.add(navKey)
  const keys = level === 'full' ? getFullGrant(bundle) : getMinimumGrant(bundle)
  for (const key of keys) next.add(key)
  return next
}

export function applyNavRevoke(draft, navKey, bundle) {
  const next = new Set(draft)
  for (const key of collectBundlePermissionKeys(bundle)) next.delete(key)
  next.delete(navKey)
  return next
}

/**
 * Build permissions UI sections from GET /permission-bundles (15 canonical nav keys only).
 * Section order/labels fall back to sidebarPermissions.js when bundle omits them.
 */
export function buildNavSectionsFromBundles(bundles = [], sectionCatalog = SIDEBAR_PERMISSION_SECTIONS) {
  const bundleMap = bundleByNavKey(filterCanonicalBundles(bundles))

  return sectionCatalog
    .map((section) => ({
      section: section.section,
      permissions: section.permissions
        .filter((perm) => isCanonicalNavKey(perm.key))
        .map((perm) => {
          const bundle = bundleMap.get(perm.key)
          return {
            ...perm,
            key: perm.key,
            label: bundle?.label || perm.label,
            path: bundle?.route || perm.path,
          }
        }),
    }))
    .filter((section) => section.permissions.length > 0)
}
