import { Link, Outlet } from 'react-router-dom'
import PortalLogo from '../brand/PortalLogo'
import {
  PORTAL_COPYRIGHT,
  PORTAL_NAME,
  PORTAL_ORG,
  PORTAL_TAGLINE,
} from '../../constants/branding'

export default function AuthLayout() {
  return (
    <div className="flex min-h-screen bg-portal-bg">
      <div className="hidden w-1/2 flex-col bg-sidebar p-10 text-white lg:flex">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-green-200">
            {PORTAL_ORG}
          </p>
          <h1 className="mt-2 text-3xl font-bold leading-tight">{PORTAL_NAME}</h1>
          <p className="mt-4 max-w-md text-green-100/90">{PORTAL_TAGLINE}</p>
        </div>

        <div className="flex flex-1 items-center justify-center py-10">
          <div className="flex h-[26rem] w-[26rem] items-center justify-center rounded-full bg-white p-10 shadow-xl shadow-black/25">
            <PortalLogo size="hero" />
          </div>
        </div>

        <p className="text-xs text-green-200/60">{PORTAL_COPYRIGHT}</p>
      </div>

      <div className="flex w-full flex-col justify-center px-4 py-10 lg:w-1/2 lg:px-16">
        <div className="mb-8 flex flex-col items-center text-center lg:hidden">
          <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
            {PORTAL_ORG}
          </p>
          <h1 className="text-xl font-bold text-green-900">{PORTAL_NAME}</h1>
          <div className="mt-5 flex h-56 w-56 items-center justify-center rounded-full bg-white p-6 shadow-md">
            <PortalLogo size="2xl" />
          </div>
        </div>
        <div className="mx-auto w-full max-w-md rounded-2xl border border-green-100 bg-white p-6 shadow-lg shadow-green-900/5 sm:p-8">
          <Outlet />
        </div>
        <p className="mx-auto mt-6 max-w-md text-center text-sm text-slate-500">
          <Link to="/auth/login" className="font-medium text-portal-primary hover:underline">
            Login
          </Link>
          {' · '}
          <Link to="/auth/register" className="font-medium text-portal-primary hover:underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  )
}
