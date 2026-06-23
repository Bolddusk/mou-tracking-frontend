import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const CHANGE_PASSWORD_PATH = '/auth/change-password'

export default function ProtectedRoute({
  children,
  allowedRole,
  allowedRoles,
  allowPasswordChange = false,
}) {
  const { isAuthenticated, user, dashboardPath, mustChangePassword } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />
  }

  if (
    mustChangePassword &&
    !allowPasswordChange &&
    location.pathname !== CHANGE_PASSWORD_PATH
  ) {
    return <Navigate to={CHANGE_PASSWORD_PATH} replace />
  }

  const roles = allowedRoles || (allowedRole ? [allowedRole] : null)
  if (roles && !roles.includes(user?.role)) {
    return <Navigate to={dashboardPath} replace />
  }

  return children
}
