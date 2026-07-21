import { Navigate, NavLink, Outlet, useLocation } from 'react-router-dom'
import { ADMIN_SETTINGS_TABS } from '../../constants/adminSettings'
import { ROLES } from '../../constants/sectors'
import { useAuth } from '../../context/AuthContext'
import { canAny } from '../../utils/rbac'

function tabIsActive(tab, pathname) {
  if (pathname === tab.path) return true
  if (tab.id === 'sector-officer' && pathname.startsWith(`${tab.path}/`)) return true
  if (tab.id === 'compliance' && pathname.startsWith(`${tab.path}/`)) return true
  return false
}

function settingsTabClass(isActive) {
  return `rounded-t-lg px-4 py-2.5 text-sm font-semibold transition ${
    isActive
      ? 'border border-b-white border-slate-200 bg-white text-portal-primary'
      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
  }`
}

function isTabVisible(tab, rbac) {
  if (tab.superAdminOnly && rbac?.role !== ROLES.SUPER_ADMIN) return false
  return canAny(rbac, tab.permissions)
}

export function AdminSettingsDefaultRedirect() {
  const { rbac, isPowerAdmin, dashboardPath } = useAuth()
  if (isPowerAdmin || rbac?.role === ROLES.POWER_ADMIN) {
    return <Navigate to={dashboardPath || '/dashboard/super-admin'} replace />
  }
  const first = ADMIN_SETTINGS_TABS.find((tab) => isTabVisible(tab, rbac))
  if (!first) return <Navigate to="/unauthorized" replace />
  return <Navigate to={first.path} replace />
}

export default function AdminSettingsLayout() {
  const { rbac, isPowerAdmin, dashboardPath } = useAuth()
  const location = useLocation()

  if (isPowerAdmin || rbac?.role === ROLES.POWER_ADMIN) {
    return <Navigate to={dashboardPath || '/dashboard/super-admin'} replace />
  }

  const visibleTabs = ADMIN_SETTINGS_TABS.filter((tab) => isTabVisible(tab, rbac))

  if (!visibleTabs.length) {
    return <Navigate to="/unauthorized" replace />
  }

  const onSettingsRoot =
    location.pathname === '/admin/settings' || location.pathname === '/admin/settings/'

  if (onSettingsRoot) {
    return <Navigate to={visibleTabs[0].path} replace />
  }

  const onKnownTab = visibleTabs.some((tab) => location.pathname.startsWith(tab.path))

  if (!onKnownTab && location.pathname.startsWith('/admin/settings')) {
    return <Navigate to={visibleTabs[0].path} replace />
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <nav
          className="flex flex-wrap gap-1 border-b border-slate-200 px-4 pt-2"
          aria-label="Settings"
        >
          {visibleTabs.map((tab) => {
            const isActive = tabIsActive(tab, location.pathname)
            return (
              <NavLink
                key={tab.id}
                to={tab.path}
                end={tab.id !== 'sector-officer' && tab.id !== 'compliance'}
                className={settingsTabClass(isActive)}
                aria-current={isActive ? 'page' : undefined}
              >
                {tab.label}
              </NavLink>
            )
          })}
        </nav>
      </div>
      <Outlet />
    </div>
  )
}

export function AdminSettingsTab({ permissions, children, superAdminOnly = false }) {
  const { rbac, isPowerAdmin, dashboardPath } = useAuth()
  if (isPowerAdmin || rbac?.role === ROLES.POWER_ADMIN) {
    return <Navigate to={dashboardPath || '/dashboard/super-admin'} replace />
  }
  if (superAdminOnly && rbac?.role !== ROLES.SUPER_ADMIN) {
    return <Navigate to="/admin/settings" replace />
  }
  if (!canAny(rbac, permissions)) {
    return <Navigate to="/admin/settings" replace />
  }
  return children
}
