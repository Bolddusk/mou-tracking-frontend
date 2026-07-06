import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { SectorsProvider } from './context/SectorsContext'
import ProtectedRoute from './components/ProtectedRoute'
import AuthLayout from './components/layout/AuthLayout'
import DashboardLayout from './components/layout/DashboardLayout'
import { ROUTE_ACCESS } from './constants/routePermissions'
import AdminSettingsLayout, {
  AdminSettingsDefaultRedirect,
  AdminSettingsTab,
} from './pages/admin/AdminSettingsLayout'
import { getAdminSettingsTab } from './constants/adminSettings'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import ChangePassword from './pages/auth/ChangePassword'
import NewProposal from './pages/proposals/NewProposal'
import PartyADashboard from './pages/dashboard/PartyADashboard'
import PartyAProfile from './pages/profile/PartyAProfile'
import UserProfile from './pages/profile/UserProfile'
import PartyAProfileView from './pages/profile/PartyAProfileView'
import PartyBProfile from './pages/profile/PartyBProfile'
import PartyBProfileView from './pages/profile/PartyBProfileView'
import PartyBDashboard from './pages/dashboard/PartyBDashboard'
import SectorLeadDashboard from './pages/dashboard/SectorLeadDashboard'
import SuperAdminDashboard from './pages/dashboard/SuperAdminDashboard'
import ConferenceReportPage from './pages/reports/ConferenceReportPage'
import RegionalFocalDashboard from './pages/dashboard/RegionalFocalDashboard'
import ProposalDetail from './pages/proposals/ProposalDetail'
import ComplaintsList from './pages/complaints/ComplaintsList'
import NewComplaint from './pages/complaints/NewComplaint'
import ComplaintDetail from './pages/complaints/ComplaintDetail'
import UsersList from './pages/admin/UsersList'
import NewUser from './pages/admin/NewUser'
import UserDetail from './pages/admin/UserDetail'
import PermissionsAdmin from './pages/admin/PermissionsAdmin'
import SectorsAdmin from './pages/admin/SectorsAdmin'
import ConferencesAdmin from './pages/admin/ConferencesAdmin'
import SifcCategoriesAdmin from './pages/admin/SifcCategoriesAdmin'
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
import Unauthorized from './pages/Unauthorized'

function HomeRedirect() {
  const { isAuthenticated, dashboardPath, mustChangePassword } = useAuth()
  if (isAuthenticated) {
    if (mustChangePassword) return <Navigate to="/auth/change-password" replace />
    return <Navigate to={dashboardPath} replace />
  }
  return <Navigate to="/auth/login" replace />
}

function PermissionShell({ title, permissions }) {
  return (
    <ProtectedRoute permissions={permissions}>
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
        <SectorsProvider>
        <Routes>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          <Route path="/auth" element={<AuthLayout />}>
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
            <Route path="change-password" element={<ChangePasswordShell />} />
          </Route>

          <Route element={<AuthenticatedShell title="My Profile" />}>
            <Route path="/profile" element={<UserProfile />} />
          </Route>

          <Route
            element={
              <PermissionShell title="Party A Dashboard" permissions={ROUTE_ACCESS.partyADashboard} />
            }
          >
            <Route path="/dashboard/party-a" element={<PartyADashboard />} />
            <Route path="/dashboard/party-a/profile" element={<PartyAProfile />} />
          </Route>

          <Route
            element={
              <PermissionShell title="Party B Dashboard" permissions={ROUTE_ACCESS.partyBDashboard} />
            }
          >
            <Route path="/dashboard/party-b" element={<PartyBDashboard />} />
          </Route>

          <Route
            element={
              <PermissionShell title="Company Profile" permissions={ROUTE_ACCESS.partyBProfile} />
            }
          >
            <Route path="/dashboard/party-b/profile" element={<PartyBProfile />} />
          </Route>

          <Route
            element={
              <PermissionShell title="MOUS" permissions={ROUTE_ACCESS.newDirectProposal} />
            }
          >
            <Route path="/proposals/new" element={<NewProposal />} />
          </Route>

          <Route
            element={
              <PermissionShell title="My Proposals" permissions={ROUTE_ACCESS.mmMyProposals} />
            }
          >
            <Route path="/matchmaking/my-proposals" element={<MmMyProposalsDashboard />} />
          </Route>

          <Route
            element={<PermissionShell title="New Proposal" permissions={ROUTE_ACCESS.mmNew} />}
          >
            <Route path="/matchmaking/new" element={<NewMmProposal />} />
          </Route>

          <Route
            element={
              <PermissionShell title="Review Queue" permissions={ROUTE_ACCESS.mmReviewQueue} />
            }
          >
            <Route path="/matchmaking/focal-point" element={<MmFocalPointDashboard />} />
          </Route>

          <Route
            element={
              <PermissionShell title="Forwarded to Me" permissions={ROUTE_ACCESS.mmForwarded} />
            }
          >
            <Route path="/matchmaking/forwarded" element={<MmForwardedDashboard />} />
          </Route>

          <Route
            element={<PermissionShell title="Matching Board" permissions={ROUTE_ACCESS.mmBoard} />}
          >
            <Route path="/matchmaking/board" element={<MmMatchingBoard />} />
          </Route>

          <Route
            element={<PermissionShell title="Matches" permissions={ROUTE_ACCESS.mmMatches} />}
          >
            <Route path="/matchmaking/matches" element={<MmMatchesDashboard />} />
            <Route path="/matchmaking/matches/:id" element={<MmMatchDetail />} />
          </Route>

          <Route
            element={
              <PermissionShell
                title="Matchmaking Oversight"
                permissions={ROUTE_ACCESS.mmAllProposals}
              />
            }
          >
            <Route path="/matchmaking/all" element={<MmMyProposalsDashboard adminOversight />} />
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
            element={
              <PermissionShell title="Proposal Detail" permissions={ROUTE_ACCESS.mmProposalDetail} />
            }
          >
            <Route path="/matchmaking/:id" element={<MmProposalDetail />} />
          </Route>

          <Route
            element={
              <PermissionShell
                title="Sector Lead Dashboard"
                permissions={ROUTE_ACCESS.sectorLeadDashboard}
              />
            }
          >
            <Route path="/dashboard/sector-lead" element={<SectorLeadDashboard />} />
            <Route
              path="/dashboard/sector-lead/party-a-profiles/:userId"
              element={<PartyAProfileView />}
            />
            <Route
              path="/dashboard/sector-lead/party-b-profiles/:userId"
              element={<PartyBProfileView />}
            />
          </Route>

          <Route
            element={
              <PermissionShell
                title="Super Admin Dashboard"
                permissions={ROUTE_ACCESS.superAdminDashboard}
              />
            }
          >
            <Route path="/dashboard/super-admin" element={<SuperAdminDashboard />} />
            <Route path="/dashboard/super-admin/mous" element={<SuperAdminDashboard />} />
            <Route
              path="/dashboard/super-admin/party-a-profiles/:userId"
              element={<PartyAProfileView />}
            />
            <Route
              path="/dashboard/super-admin/party-b-profiles/:userId"
              element={<PartyBProfileView />}
            />
          </Route>

          <Route
            element={
              <PermissionShell title="Focal Point" permissions={ROUTE_ACCESS.mmReviewQueue} />
            }
          >
            <Route
              path="/dashboard/focal-point"
              element={<Navigate to="/matchmaking/focal-point" replace />}
            />
          </Route>

          <Route
            element={
              <PermissionShell title="Regional Focal Point" permissions={ROUTE_ACCESS.regionalFocal} />
            }
          >
            <Route path="/dashboard/regional-focal" element={<RegionalFocalDashboard />} />
          </Route>

          <Route
            element={
              <PermissionShell title="MOU" permissions={ROUTE_ACCESS.proposalDetail} />
            }
          >
            <Route path="/proposals/:id" element={<ProposalDetail />} />
            <Route path="/matchmaking/engagement/:id/mou" element={<MmEngagementMou />} />
            <Route path="/matchmaking/matches/:id/mou" element={<MmEngagementMou />} />
          </Route>

          <Route
            element={
              <PermissionShell
                title="Conference Report"
                permissions={ROUTE_ACCESS.conferenceReport}
              />
            }
          >
            <Route path="/reports/conference/:conferenceKey" element={<ConferenceReportPage />} />
          </Route>

          <Route element={<PermissionShell title="Complaints" permissions={ROUTE_ACCESS.complaints} />}>
            <Route path="/complaints" element={<ComplaintsList />} />
          </Route>

          <Route
            element={
              <PermissionShell title="File Complaint" permissions={ROUTE_ACCESS.complaintsNew} />
            }
          >
            <Route path="/complaints/new" element={<NewComplaint />} />
          </Route>

          <Route
            element={
              <PermissionShell title="Complaint Detail" permissions={ROUTE_ACCESS.complaints} />
            }
          >
            <Route path="/complaints/:id" element={<ComplaintDetail />} />
          </Route>

          <Route
            element={
              <PermissionShell title="Settings" permissions={ROUTE_ACCESS.adminSettings} />
            }
          >
            <Route path="/admin/settings" element={<AdminSettingsLayout />}>
              <Route index element={<AdminSettingsDefaultRedirect />} />
              <Route
                path="users"
                element={
                  <AdminSettingsTab permissions={getAdminSettingsTab('users').permissions}>
                    <UsersList />
                  </AdminSettingsTab>
                }
              />
              <Route
                path="sectors"
                element={
                  <AdminSettingsTab permissions={getAdminSettingsTab('sectors').permissions}>
                    <SectorsAdmin />
                  </AdminSettingsTab>
                }
              />
              <Route
                path="conferences"
                element={
                  <AdminSettingsTab permissions={getAdminSettingsTab('conferences').permissions}>
                    <ConferencesAdmin />
                  </AdminSettingsTab>
                }
              />
              <Route
                path="sifc-categories"
                element={
                  <AdminSettingsTab permissions={getAdminSettingsTab('sifc-categories').permissions}>
                    <SifcCategoriesAdmin />
                  </AdminSettingsTab>
                }
              />
              <Route
                path="permissions"
                element={
                  <AdminSettingsTab permissions={getAdminSettingsTab('permissions').permissions}>
                    <PermissionsAdmin />
                  </AdminSettingsTab>
                }
              />
              <Route
                path="sector-officer"
                element={
                  <AdminSettingsTab permissions={getAdminSettingsTab('sector-officer').permissions}>
                    <SectorLeadHandoff />
                  </AdminSettingsTab>
                }
              />
              <Route
                path="sector-officer/reassign"
                element={
                  <AdminSettingsTab permissions={getAdminSettingsTab('sector-officer').permissions}>
                    <SectorLeadReassign />
                  </AdminSettingsTab>
                }
              />
              <Route
                path="compliance"
                element={
                  <AdminSettingsTab permissions={getAdminSettingsTab('compliance').permissions}>
                    <ComplianceFilingsOverview />
                  </AdminSettingsTab>
                }
              />
              <Route
                path="compliance/:userId"
                element={
                  <AdminSettingsTab permissions={getAdminSettingsTab('compliance').permissions}>
                    <ComplianceFilingDetail />
                  </AdminSettingsTab>
                }
              />
            </Route>
          </Route>

          <Route path="/admin/users" element={<Navigate to="/admin/settings/users" replace />} />
          <Route path="/admin/permissions" element={<Navigate to="/admin/settings/permissions" replace />} />
          <Route path="/admin/sectors" element={<Navigate to="/admin/settings/sectors" replace />} />
          <Route
            path="/dashboard/super-admin/sector-lead/handoff"
            element={<Navigate to="/admin/settings/sector-officer" replace />}
          />
          <Route
            path="/dashboard/super-admin/sector-lead/reassign"
            element={<Navigate to="/admin/settings/sector-officer" replace />}
          />
          <Route
            path="/dashboard/super-admin/compliance"
            element={<Navigate to="/admin/settings/compliance" replace />}
          />
          <Route
            path="/dashboard/super-admin/compliance/:userId"
            element={<Navigate to="/admin/settings/compliance/:userId" replace />}
          />

          <Route element={<PermissionShell title="Add User" permissions={ROUTE_ACCESS.users} />}>
            <Route path="/admin/users/new" element={<NewUser />} />
          </Route>

          <Route element={<PermissionShell title="User Detail" permissions={ROUTE_ACCESS.users} />}>
            <Route path="/admin/users/:id" element={<UserDetail />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </SectorsProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
