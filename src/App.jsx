import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import AuthLayout from './components/layout/AuthLayout'
import DashboardLayout from './components/layout/DashboardLayout'
import { ROLES } from './constants/sectors'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import ChangePassword from './pages/auth/ChangePassword'
import NewProposal from './pages/proposals/NewProposal'
import PartyADashboard from './pages/dashboard/PartyADashboard'
import PartyAProfile from './pages/profile/PartyAProfile'
import UserProfile from './pages/profile/UserProfile'
import PartyAProfileView from './pages/profile/PartyAProfileView'
import PartyBDashboard from './pages/dashboard/PartyBDashboard'
import SectorLeadDashboard from './pages/dashboard/SectorLeadDashboard'
import SuperAdminDashboard from './pages/dashboard/SuperAdminDashboard'
import RegionalFocalDashboard from './pages/dashboard/RegionalFocalDashboard'
import ProposalDetail from './pages/proposals/ProposalDetail'
import ComplaintsList from './pages/complaints/ComplaintsList'
import NewComplaint from './pages/complaints/NewComplaint'
import ComplaintDetail from './pages/complaints/ComplaintDetail'
import UsersList from './pages/admin/UsersList'
import NewUser from './pages/admin/NewUser'
import UserDetail from './pages/admin/UserDetail'
import SectorLeadReassign from './pages/admin/SectorLeadReassign'
import SectorLeadHandoff from './pages/admin/SectorLeadHandoff'
import ComplianceFilingsOverview from './pages/admin/ComplianceFilingsOverview'
import ComplianceFilingDetail from './pages/admin/ComplianceFilingDetail'
import NewMmProposal from './pages/matchmaking/NewMmProposal'
import MmProposalDetail from './pages/matchmaking/MmProposalDetail'
import MmMyProposalsDashboard from './pages/matchmaking/MmMyProposalsDashboard'
import MmFocalPointDashboard from './pages/matchmaking/MmFocalPointDashboard'
import MmForwardedDashboard from './pages/matchmaking/MmForwardedDashboard'
import MmMatchingBoard from './pages/matchmaking/MmMatchingBoard'
import MmMatchesDashboard from './pages/matchmaking/MmMatchesDashboard'
import MmMatchDetail from './pages/matchmaking/MmMatchDetail'
import MmEngagementMou from './pages/matchmaking/MmEngagementMou'

const COMPLAINT_ROLES = [
  ROLES.PARTY_A,
  ROLES.PARTY_B,
  ROLES.SECTOR_LEAD,
  ROLES.SUPER_ADMIN,
  ROLES.REGIONAL_FOCAL_POINT,
]

const PROPOSAL_DETAIL_ROLES = [
  ROLES.PARTY_A,
  ROLES.PARTY_B,
  ROLES.INVESTOR,
  ROLES.SECTOR_LEAD,
  ROLES.SUPER_ADMIN,
  ROLES.REGIONAL_FOCAL_POINT,
  ROLES.FOCAL_POINT,
]

const MM_SUBMITTER_ROLES = [ROLES.PARTY_A, ROLES.INVESTOR, ROLES.SUPER_ADMIN]

const MM_REVIEW_ROLES = [
  ROLES.FOCAL_POINT,
  ROLES.REGIONAL_FOCAL_POINT,
  ROLES.SECTOR_LEAD,
  ROLES.SUPER_ADMIN,
]

const MM_MATCHING_ROLES = [ROLES.SECTOR_LEAD, ROLES.SUPER_ADMIN]

const MM_PROPOSAL_VIEW_ROLES = [
  ROLES.PARTY_A,
  ROLES.INVESTOR,
  ROLES.FOCAL_POINT,
  ROLES.REGIONAL_FOCAL_POINT,
  ROLES.SECTOR_LEAD,
  ROLES.SUPER_ADMIN,
]

function HomeRedirect() {
  const { isAuthenticated, dashboardPath, mustChangePassword } = useAuth()
  if (isAuthenticated) {
    if (mustChangePassword) return <Navigate to="/auth/change-password" replace />
    return <Navigate to={dashboardPath} replace />
  }
  return <Navigate to="/auth/login" replace />
}

function RoleShell({ title, allowedRole }) {
  return (
    <ProtectedRoute allowedRole={allowedRole}>
      <DashboardLayout title={title} />
    </ProtectedRoute>
  )
}

function MultiRoleShell({ title, allowedRoles }) {
  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <DashboardLayout title={title} />
    </ProtectedRoute>
  )
}

function AuthenticatedShell({ title }) {
  return (
    <ProtectedRoute>
      <DashboardLayout title={title} />
    </ProtectedRoute>
  )
}

function ChangePasswordShell() {
  return (
    <ProtectedRoute allowPasswordChange>
      <ChangePassword />
    </ProtectedRoute>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<HomeRedirect />} />

          <Route path="/auth" element={<AuthLayout />}>
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
            <Route path="change-password" element={<ChangePasswordShell />} />
          </Route>

          <Route element={<AuthenticatedShell title="My Profile" />}>
            <Route path="/profile" element={<UserProfile />} />
          </Route>

          <Route element={<RoleShell title="Party A Dashboard" allowedRole={ROLES.PARTY_A} />}>
            <Route path="/dashboard/party-a" element={<PartyADashboard />} />
            <Route path="/dashboard/party-a/profile" element={<PartyAProfile />} />
          </Route>

          <Route element={<RoleShell title="Party B Dashboard" allowedRole={ROLES.PARTY_B} />}>
            <Route path="/dashboard/party-b" element={<PartyBDashboard />} />
          </Route>

          <Route
            element={
              <MultiRoleShell
                title="MOUS"
                allowedRoles={[ROLES.PARTY_A, ROLES.SUPER_ADMIN]}
              />
            }
          >
            <Route path="/proposals/new" element={<NewProposal />} />
          </Route>

          <Route
            element={
              <MultiRoleShell title="My Proposals" allowedRoles={[ROLES.PARTY_A, ROLES.INVESTOR]} />
            }
          >
            <Route path="/matchmaking/my-proposals" element={<MmMyProposalsDashboard />} />
          </Route>

          <Route
            element={
              <MultiRoleShell title="New Proposal" allowedRoles={MM_SUBMITTER_ROLES} />
            }
          >
            <Route path="/matchmaking/new" element={<NewMmProposal />} />
          </Route>

          <Route
            element={<MultiRoleShell title="Review Queue" allowedRoles={MM_REVIEW_ROLES} />}
          >
            <Route path="/matchmaking/focal-point" element={<MmFocalPointDashboard />} />
          </Route>

          <Route
            element={
              <MultiRoleShell
                title="Forwarded to Me"
                allowedRoles={[ROLES.SECTOR_LEAD, ROLES.SUPER_ADMIN]}
              />
            }
          >
            <Route path="/matchmaking/forwarded" element={<MmForwardedDashboard />} />
          </Route>

          <Route
            element={<MultiRoleShell title="Matching Board" allowedRoles={MM_MATCHING_ROLES} />}
          >
            <Route path="/matchmaking/board" element={<MmMatchingBoard />} />
          </Route>

          <Route
            element={
              <MultiRoleShell
                title="Matches"
                allowedRoles={[ROLES.SECTOR_LEAD, ROLES.SUPER_ADMIN, ROLES.PARTY_A, ROLES.INVESTOR]}
              />
            }
          >
            <Route path="/matchmaking/matches" element={<MmMatchesDashboard />} />
            <Route path="/matchmaking/matches/:id" element={<MmMatchDetail />} />
          </Route>

          <Route
            element={
              <MultiRoleShell title="Proposal Detail" allowedRoles={MM_PROPOSAL_VIEW_ROLES} />
            }
          >
            <Route path="/matchmaking/:id" element={<MmProposalDetail />} />
          </Route>

          <Route element={<RoleShell title="Sector Lead Dashboard" allowedRole={ROLES.SECTOR_LEAD} />}>
            <Route path="/dashboard/sector-lead" element={<SectorLeadDashboard />} />
            <Route
              path="/dashboard/sector-lead/party-a-profiles/:userId"
              element={<PartyAProfileView />}
            />
          </Route>

          <Route element={<RoleShell title="Super Admin Dashboard" allowedRole={ROLES.SUPER_ADMIN} />}>
            <Route path="/dashboard/super-admin" element={<SuperAdminDashboard />} />
            <Route
              path="/dashboard/super-admin/party-a-profiles/:userId"
              element={<PartyAProfileView />}
            />
            <Route
              path="/dashboard/super-admin/sector-lead/reassign"
              element={<SectorLeadReassign />}
            />
            <Route
              path="/dashboard/super-admin/sector-lead/handoff"
              element={<SectorLeadHandoff />}
            />
            <Route
              path="/dashboard/super-admin/compliance"
              element={<ComplianceFilingsOverview />}
            />
            <Route
              path="/dashboard/super-admin/compliance/:userId"
              element={<ComplianceFilingDetail />}
            />
          </Route>

          <Route
            element={
              <RoleShell title="Super Admin — Matchmaking Oversight" allowedRole={ROLES.SUPER_ADMIN} />
            }
          >
            <Route
              path="/matchmaking/admin/my-proposals"
              element={<MmMyProposalsDashboard adminOversight />}
            />
            <Route
              path="/matchmaking/admin/focal-point"
              element={<MmFocalPointDashboard adminOversight />}
            />
            <Route
              path="/matchmaking/admin/forwarded"
              element={<MmForwardedDashboard adminOversight />}
            />
            <Route path="/matchmaking/admin/board" element={<MmMatchingBoard adminOversight />} />
            <Route
              path="/matchmaking/admin/matches"
              element={<MmMatchesDashboard adminOversight />}
            />
            <Route path="/matchmaking/admin/matches/:id" element={<MmMatchDetail />} />
            <Route path="/matchmaking/admin/:id" element={<MmProposalDetail adminOversight />} />
          </Route>

          <Route
            element={<RoleShell title="Focal Point Dashboard" allowedRole={ROLES.FOCAL_POINT} />}
          >
            <Route path="/dashboard/focal-point" element={<Navigate to="/matchmaking/focal-point" replace />} />
          </Route>

          <Route
            element={
              <RoleShell title="Regional Focal Point" allowedRole={ROLES.REGIONAL_FOCAL_POINT} />
            }
          >
            <Route path="/dashboard/regional-focal" element={<RegionalFocalDashboard />} />
          </Route>

          <Route
            element={
              <MultiRoleShell
                title="Proposal Detail"
                allowedRoles={PROPOSAL_DETAIL_ROLES}
              />
            }
          >
            <Route path="/proposals/:id" element={<ProposalDetail />} />
            <Route path="/matchmaking/engagement/:id/mou" element={<MmEngagementMou />} />
            <Route path="/matchmaking/matches/:id/mou" element={<MmEngagementMou />} />
          </Route>

          <Route element={<MultiRoleShell title="Complaints" allowedRoles={COMPLAINT_ROLES} />}>
            <Route path="/complaints" element={<ComplaintsList />} />
          </Route>

          <Route
            element={
              <MultiRoleShell
                title="File Complaint"
                allowedRoles={[ROLES.PARTY_A, ROLES.PARTY_B]}
              />
            }
          >
            <Route path="/complaints/new" element={<NewComplaint />} />
          </Route>

          <Route
            element={<MultiRoleShell title="Complaint Detail" allowedRoles={COMPLAINT_ROLES} />}
          >
            <Route path="/complaints/:id" element={<ComplaintDetail />} />
          </Route>

          <Route element={<RoleShell title="Users" allowedRole={ROLES.SUPER_ADMIN} />}>
            <Route path="/admin/users" element={<UsersList />} />
          </Route>

          <Route element={<RoleShell title="Add User" allowedRole={ROLES.SUPER_ADMIN} />}>
            <Route path="/admin/users/new" element={<NewUser />} />
          </Route>

          <Route element={<RoleShell title="User Detail" allowedRole={ROLES.SUPER_ADMIN} />}>
            <Route path="/admin/users/:id" element={<UserDetail />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
