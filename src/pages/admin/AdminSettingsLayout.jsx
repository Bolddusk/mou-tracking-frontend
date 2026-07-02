import { Navigate, NavLink, Outlet, useLocation } from 'react-router-dom'
import { ADMIN_SETTINGS_TABS } from '../../constants/adminSettings'
import { useAuth } from '../../context/AuthContext'
import { canAny } from '../../utils/rbac'

function tabIsActive(tab, pathname) {
  if (pathname === tab.path) return true
  if (tab.id === 'sector-officer' && pathname.startsWith(`${tab.path}/`)) return true
  if (tab.id === 'compliance' && pathname.startsWith(`${tab.path}/`)) return true
  return false
}

function settingsTabClass(isActive) {
  return `inline-flex shrink-0 items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold transition-all sm:px-6 sm:py-3.5 sm:text-base ${
    isActive
      ? 'bg-portal-primary text-white shadow-md shadow-green-900/15 ring-1 ring-portal-primary/20'
      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
  }`
}

export function AdminSettingsDefaultRedirect() {
  const { rbac } = useAuth()
  const first = ADMIN_SETTINGS_TABS.find((tab) => canAny(rbac, tab.permissions))
  if (!first) return <Navigate to="/unauthorized" replace />
  return <Navigate to={first.path} replace />
}

export default function AdminSettingsLayout() {
  const { rbac } = useAuth()
  const location = useLocation()

  const visibleTabs = ADMIN_SETTINGS_TABS.filter((tab) => canAny(rbac, tab.permissions))

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
      <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm sm:p-3">
        <nav
          className="flex flex-wrap gap-2 sm:gap-3"
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

export function AdminSettingsTab({ permissions, children }) {
  const { rbac } = useAuth()
  if (!canAny(rbac, permissions)) {
    return <Navigate to="/admin/settings" replace />
  }
  return children
}
