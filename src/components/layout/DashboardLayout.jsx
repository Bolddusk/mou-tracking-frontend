import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { PORTAL_SHORT } from '../../constants/branding'
import { ROLE_LABELS } from '../../constants/sectors'

function looksLikePlaceholderName(name) {
  if (!name) return true
  if (name.length > 50) return true
  if (/^(.)\1{8,}$/.test(name)) return true
  if (/^\d{10,}$/.test(name)) return true
  return false
}

function headerDisplayName(user, isPartyB) {
  if (!user) return ''
  const name = user.full_name?.trim() || ''
  const org = user.organization?.trim() || ''

  if (isPartyB) {
    if (name && !looksLikePlaceholderName(name) && name !== org) {
      return name
    }
    return user.email?.split('@')[0] || user.email || name || 'Party B'
  }

  return name || user.email || ''
}

const navLinkClass = ({ isActive }) =>
  `flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
    isActive
      ? 'bg-white/15 text-green-100 ring-1 ring-white/20'
      : 'text-green-100/80 hover:bg-sidebar-hover hover:text-white'
  }`

const mmNavLinkClass = ({ isActive }) =>
  `flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
    isActive
      ? 'bg-green-400/20 text-green-100 ring-1 ring-green-300/30'
      : 'text-green-100/80 hover:bg-sidebar-hover hover:text-white'
  }`

export default function DashboardLayout({ title }) {
  const {
    user,
    logout,
    isPartyA,
    isPartyB,
    isSectorLead,
    isSuperAdmin,
    isRegionalFocalPoint,
    isInvestor,
    isFocalPoint,
  } = useAuth()
  const navigate = useNavigate()

  const dashboardPath = isPartyA
    ? '/dashboard/party-a'
    : isPartyB
      ? '/dashboard/party-b'
      : isSectorLead
        ? '/dashboard/sector-lead'
        : isSuperAdmin
          ? '/dashboard/super-admin'
          : isRegionalFocalPoint
            ? '/dashboard/regional-focal'
            : isInvestor
              ? '/matchmaking/my-proposals'
              : isFocalPoint
                ? '/matchmaking/focal-point'
                : '/auth/login'

  const footerLabel = isPartyA
    ? 'Party A — Opportunity Submission'
    : isPartyB
      ? 'Party B — Invited Proposals'
      : isSectorLead
        ? `Sector Lead — ${user?.sector || 'Review'}`
        : isSuperAdmin
          ? 'Super Admin — All Sectors'
          : isRegionalFocalPoint
            ? `Regional Focal — ${user?.sector || 'Complaints'}`
            : isInvestor
              ? 'Investor — Matchmaking'
              : isFocalPoint
                ? `Focal Point — ${user?.sector || 'Review'}`
                : PORTAL_SHORT

  const handleLogout = () => {
    logout()
    navigate('/auth/login')
  }

  const displayName = useMemo(
    () => headerDisplayName(user, isPartyB),
    [user, isPartyB],
  )

  return (
    <div className="flex min-h-screen bg-portal-bg">
      <aside className="hidden w-64 shrink-0 flex-col bg-sidebar text-white lg:flex">
        <div className="border-b border-white/10 px-6 py-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-green-200">
            Government of Pakistan
          </p>
          <h1 className="text-lg font-bold leading-tight text-white">MOU Tracking</h1>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {isSuperAdmin ? (
            <>
              <p className="px-4 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-widest text-green-300/80">
                Super Admin
              </p>
              <NavLink to="/dashboard/super-admin" end className={navLinkClass}>
                All Opportunities
              </NavLink>
              <NavLink to="/proposals/new" className={navLinkClass}>
                MOUS
              </NavLink>
              <p className="mt-4 px-4 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-widest text-green-300/90">
                Matchmaking Oversight
              </p>
              <NavLink to="/matchmaking/admin/my-proposals" end className={mmNavLinkClass}>
                All Proposals
              </NavLink>
              <NavLink to="/matchmaking/new" className={mmNavLinkClass}>
                New Proposal
              </NavLink>
              <NavLink to="/matchmaking/admin/focal-point" end className={mmNavLinkClass}>
                Review Queue
              </NavLink>
              <NavLink to="/matchmaking/admin/forwarded" end className={mmNavLinkClass}>
                Forwarded
              </NavLink>
              <NavLink to="/matchmaking/admin/board" className={mmNavLinkClass}>
                Matching Board
              </NavLink>
              <NavLink to="/matchmaking/admin/matches" end className={mmNavLinkClass}>
                All Matches
              </NavLink>
            </>
          ) : (
            <>
              <p className="px-4 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-widest text-green-300/80">
                Direct Opportunities
              </p>
              <NavLink to={dashboardPath} end className={navLinkClass}>
                Dashboard
              </NavLink>
            </>
          )}
          {isPartyA && (
            <NavLink to="/proposals/new" className={navLinkClass} title="Direct — partner + MOU ready">
              Direct MOUS
            </NavLink>
          )}

          {(isPartyA || isInvestor) && (
            <>
              <p className="mt-4 px-4 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-widest text-green-300/90">
                Matchmaking
              </p>
              <NavLink to="/matchmaking/my-proposals" end className={mmNavLinkClass}>
                My Proposals
              </NavLink>
              <NavLink to="/matchmaking/new" className={mmNavLinkClass}>
                New Proposal
              </NavLink>
            </>
          )}

          {(isFocalPoint || isRegionalFocalPoint) && (
            <>
              <p className="mt-4 px-4 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-widest text-green-300/90">
                Matchmaking Review
              </p>
              <NavLink to="/matchmaking/focal-point" end className={mmNavLinkClass}>
                Review Queue
              </NavLink>
            </>
          )}

          {isSectorLead && (
            <>
              <p className="mt-4 px-4 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-widest text-green-300/90">
                Matchmaking Review
              </p>
              <NavLink to="/matchmaking/forwarded" end className={mmNavLinkClass}>
                Forwarded to Me
              </NavLink>
              <NavLink to="/matchmaking/board" className={mmNavLinkClass}>
                Matching Board
              </NavLink>
              <NavLink to="/matchmaking/matches" end className={mmNavLinkClass}>
                Matches
              </NavLink>
            </>
          )}

          <p className="mt-4 px-4 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-widest text-green-300/70">
            {isSuperAdmin ? 'Administration' : 'Support'}
          </p>
          <NavLink to="/complaints" className={navLinkClass}>
            {isSuperAdmin ? 'All Complaints' : 'Complaints'}
          </NavLink>
          {isSuperAdmin && (
            <>
              <NavLink to="/admin/users" className={navLinkClass}>
                Users
              </NavLink>
              <NavLink
                to="/dashboard/super-admin/sector-lead/handoff"
                className={navLinkClass}
              >
                Sector Lead Handoff
              </NavLink>
              <NavLink
                to="/dashboard/super-admin/compliance"
                className={navLinkClass}
              >
                Compliance Filings
              </NavLink>
            </>
          )}
          <NavLink to="/auth/change-password" className={navLinkClass}>
            Change Password
          </NavLink>
        </nav>

        <div className="border-t border-white/10 px-4 py-4">
          {isPartyA && (
            <NavLink
              to="/dashboard/party-a/profile"
              className={({ isActive }) =>
                `mb-3 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-white/15 text-green-100'
                    : 'text-green-100/90 hover:bg-sidebar-hover hover:text-white'
                }`
              }
            >
              <BuildingIcon className="h-4 w-4 shrink-0 opacity-90" />
              Company Profile
            </NavLink>
          )}
          <p className="text-xs text-slate-400">{footerLabel}</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-green-100 bg-white px-4 py-3 shadow-sm sm:px-6">
          <div className="mb-2 flex gap-2 lg:hidden">
            <NavLink
              to={dashboardPath}
              className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700"
            >
              Dashboard
            </NavLink>
            {(isPartyA || isSuperAdmin) && (
              <NavLink
                to="/proposals/new"
                className="rounded-lg bg-portal-primary/20 px-3 py-1.5 text-xs font-medium text-green-800"
              >
                MOUS
              </NavLink>
            )}
            {(isPartyA || isInvestor) && (
              <NavLink
                to="/matchmaking/my-proposals"
                className="rounded-lg bg-green-600/15 px-3 py-1.5 text-xs font-medium text-green-800"
              >
                MM
              </NavLink>
            )}
            {isSectorLead && (
              <>
                <NavLink
                  to="/matchmaking/focal-point"
                  className="rounded-lg bg-green-600/15 px-3 py-1.5 text-xs font-medium text-green-800"
                >
                  Queue
                </NavLink>
                <NavLink
                  to="/matchmaking/board"
                  className="rounded-lg bg-green-600/15 px-3 py-1.5 text-xs font-medium text-green-800"
                >
                  Board
                </NavLink>
              </>
            )}
            {isSuperAdmin && (
              <>
                <NavLink
                  to="/dashboard/super-admin"
                  className="rounded-lg bg-green-100 px-3 py-1.5 text-xs font-medium text-green-800"
                >
                  Opportunities
                </NavLink>
                <NavLink
                  to="/matchmaking/admin/my-proposals"
                  className="rounded-lg bg-green-600/15 px-3 py-1.5 text-xs font-medium text-green-800"
                >
                  MM
                </NavLink>
              </>
            )}
            {(isFocalPoint || isRegionalFocalPoint) && (
              <NavLink
                to="/matchmaking/focal-point"
                className="rounded-lg bg-green-600/15 px-3 py-1.5 text-xs font-medium text-green-800"
              >
                Queue
              </NavLink>
            )}
            <NavLink
              to="/complaints"
              className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700"
            >
              Complaints
            </NavLink>
            {isSuperAdmin && (
              <NavLink
                to="/admin/users"
                className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700"
              >
                Users
              </NavLink>
            )}
            <NavLink
              to="/auth/change-password"
              className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700"
            >
              Password
            </NavLink>
          </div>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800 sm:text-xl">{title}</h2>
            <UserAccountMenu
              user={user}
              displayName={displayName}
              isPartyA={isPartyA}
              isPartyB={isPartyB}
              onLogout={handleLogout}
            />
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function UserAccountMenu({ user, displayName, isPartyA, isPartyB, onLogout }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const handleClickOutside = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const roleLine = [
    ROLE_LABELS[user?.role] || user?.role,
    user?.sector,
    isPartyB && user?.email ? user.email : null,
  ]
    .filter(Boolean)
    .join(' · ')

  const close = () => setOpen(false)

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex max-w-[14rem] items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-left transition-colors hover:bg-slate-50 sm:max-w-none sm:px-3"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-portal-primary/15 text-portal-primary">
          <ProfileIcon className="h-4 w-4" />
        </div>
        <div className="hidden min-w-0 sm:block md:max-w-[11rem]">
          <p className="truncate text-sm font-medium text-slate-800" title={displayName}>
            {displayName}
          </p>
          <p className="truncate text-xs text-slate-500" title={roleLine}>
            {roleLine}
          </p>
        </div>
        <ChevronDownIcon
          className={`ml-0.5 h-4 w-4 shrink-0 text-slate-400 transition-transform sm:ml-1 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-1.5 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
        >
          <div className="border-b border-slate-100 px-4 py-3 sm:hidden">
            <p className="truncate text-sm font-semibold text-slate-800">{displayName}</p>
            <p className="truncate text-xs text-slate-500">{roleLine}</p>
          </div>

          <Link
            to="/profile"
            role="menuitem"
            onClick={close}
            className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            <ProfileIcon className="h-4 w-4 text-slate-500" />
            My Profile
          </Link>

          {isPartyA && (
            <Link
              to="/dashboard/party-a/profile"
              role="menuitem"
              onClick={close}
              className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              <BuildingIcon className="h-4 w-4 text-slate-500" />
              Company Profile
            </Link>
          )}

          <Link
            to="/auth/change-password"
            role="menuitem"
            onClick={close}
            className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            <KeyIcon className="h-4 w-4 text-slate-500" />
            Change Password
          </Link>

          <div className="my-1 border-t border-slate-100" />

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              close()
              onLogout()
            }}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50"
          >
            <LogoutIcon className="h-4 w-4" />
            Log out
          </button>
        </div>
      )}
    </div>
  )
}

function ChevronDownIcon({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.06z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function KeyIcon({ className = '' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
      />
    </svg>
  )
}

function LogoutIcon({ className = '' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
      />
    </svg>
  )
}

function BuildingIcon({ className = '' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
      />
    </svg>
  )
}

function ProfileIcon({ className = '' }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
    </svg>
  )
}
