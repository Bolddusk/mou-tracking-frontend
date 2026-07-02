import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { canAny } from '../utils/rbac'

const CHANGE_PASSWORD_PATH = '/auth/change-password'

export default function ProtectedRoute({
  children,
  permission,
  permissions,
  allowPasswordChange = false,
}) {
  const { isAuthenticated, rbac, dashboardPath, mustChangePassword } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace state={{ from: location }} />
  }

  if (
    mustChangePassword &&
    !allowPasswordChange &&
    location.pathname !== CHANGE_PASSWORD_PATH
  ) {
    return <Navigate to={CHANGE_PASSWORD_PATH} replace />
  }

  const required = permissions || (permission ? [permission] : null)
  if (required && !canAny(rbac, required)) {
    return <Navigate to="/unauthorized" replace state={{ from: location }} />
  }

  return children
}
