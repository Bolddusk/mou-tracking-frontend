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
  return `rounded-t-lg px-4 py-2.5 text-sm font-semibold transition ${
    isActive
      ? 'border border-b-white border-slate-200 bg-white text-portal-primary'
      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
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

export function AdminSettingsTab({ permissions, children }) {
  const { rbac } = useAuth()
  if (!canAny(rbac, permissions)) {
    return <Navigate to="/admin/settings" replace />
  }
  return children
}
