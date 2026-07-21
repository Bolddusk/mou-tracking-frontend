/** Admin Settings tabs — permission per tab; sidebar shows one "Settings" link if any granted. */

export const ADMIN_SETTINGS_TABS = [
  {
    id: 'users',
    label: 'Users',
    path: '/admin/settings/users',
    permission: 'nav.users.manage',
    permissions: ['nav.users.manage', 'admin.users', 'users.manage'],
  },
  {
    id: 'ministries',
    label: 'Ministries',
    path: '/admin/settings/ministries',
    permission: 'nav.users.manage',
    permissions: ['nav.users.manage', 'admin.users', 'users.manage'],
    superAdminOnly: true,
  },
  {
    id: 'sectors',
    label: 'Sectors',
    path: '/admin/settings/sectors',
    permission: 'nav.sectors.manage',
    permissions: ['nav.sectors.manage', 'admin.sectors'],
  },
  {
    id: 'conferences',
    label: 'Conferences',
    path: '/admin/settings/conferences',
    permission: 'nav.sectors.manage',
    permissions: ['nav.sectors.manage', 'admin.sectors'],
  },
  {
    id: 'sifc-categories',
    label: 'SIFC Categories',
    path: '/admin/settings/sifc-categories',
    permission: 'nav.sectors.manage',
    permissions: ['nav.sectors.manage', 'admin.sectors'],
  },
  {
    id: 'permissions',
    label: 'Permissions',
    path: '/admin/settings/permissions',
    permission: 'nav.permissions.manage',
    permissions: ['nav.permissions.manage', 'admin.rbac'],
  },
  {
    id: 'sector-officer',
    label: 'Sector Officer Change',
    path: '/admin/settings/sector-officer',
    permission: 'nav.sector_lead.reassign',
    permissions: ['nav.sector_lead.reassign', 'admin.sl_reassign'],
  },
  {
    id: 'compliance',
    label: 'Audit & Annual Returns',
    path: '/admin/settings/compliance',
    permission: 'nav.compliance.audit',
    permissions: ['nav.compliance.audit', 'admin.compliance'],
  },
]

export const ADMIN_SETTINGS_SIDEBAR = {
  key: 'admin_settings',
  label: 'Settings',
  path: '/admin/settings',
  section: 'ADMINISTRATION',
}

export const ADMIN_SETTINGS_ROUTE_ACCESS = ADMIN_SETTINGS_TABS.flatMap((tab) => tab.permissions)

export function getAdminSettingsTab(id) {
  return ADMIN_SETTINGS_TABS.find((tab) => tab.id === id)
}
