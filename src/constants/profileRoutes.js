import { ROLES } from './sectors'

export function getPartyAProfilePaths(role) {
  if (role === ROLES.SUPER_ADMIN) {
    return {
      list: '/admin/users',
      listLabel: 'Users',
      detail: (userId) => `/dashboard/super-admin/party-a-profiles/${userId}`,
    }
  }
  return {
    list: '/dashboard/sector-lead',
    listLabel: 'Sector Review',
    detail: (userId) => `/dashboard/sector-lead/party-a-profiles/${userId}`,
  }
}

export function getProfileAccessError(err) {
  const status = err?.response?.status
  const msg = err?.response?.data?.error
  if (status === 403) {
    return (
      msg ||
      'You do not have permission to view this profile. This Party A may have no submitted proposals in your sector.'
    )
  }
  if (status === 404) {
    return msg || 'Party A profile not found.'
  }
  return null
}
