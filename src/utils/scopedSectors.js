export function getScopedSectors({ rbac, user, filterOptions } = {}) {
  const fromRbac = rbac?.context?.scoped_sectors
  if (Array.isArray(fromRbac) && fromRbac.length) return fromRbac

  const fromFilter = filterOptions?.scoped_sectors
  if (Array.isArray(fromFilter) && fromFilter.length) return fromFilter

  const fromUser = user?.assigned_sectors
  if (Array.isArray(fromUser) && fromUser.length) return fromUser

  const single =
    rbac?.context?.scoped_sector ||
    filterOptions?.scoped_sector ||
    user?.primary_sector ||
    user?.sector

  return single ? [single] : []
}

export function formatScopedSectorsLabel(sectors) {
  if (!sectors?.length) return null
  if (sectors.length === 1) return sectors[0]
  return `${sectors.length} assigned sectors`
}

export function formatScopedSectorsDetail(sectors) {
  if (!sectors?.length) return 'your assigned sectors'
  if (sectors.length === 1) return sectors[0]
  return sectors.join(', ')
}
