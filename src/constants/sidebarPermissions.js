/**
 * Single source of truth: 15 sidebar permissions for ALL roles.
 * Permissions admin + live sidebar both use this catalog.
 */

export const SIDEBAR_PERMISSION_SECTIONS = [
  {
    section: 'OVERVIEW',
    permissions: [
      {
        key: 'nav.opportunities.all',
        navKey: 'opportunities_all',
        label: 'All Opportunities',
        path: '/dashboard/super-admin',
        end: true,
      },
    ],
  },
  {
    section: 'PROPOSALS',
    permissions: [
      {
        key: 'nav.proposals.new_direct',
        navKey: 'proposals_new_direct',
        label: 'New Direct MOU',
        path: '/proposals/new',
      },
    ],
  },
  {
    section: 'MATCHMAKING',
    permissions: [
      {
        key: 'nav.matchmaking.my_proposals',
        navKey: 'mm_my_proposals',
        label: 'My Proposals',
        path: '/matchmaking/my-proposals',
        end: true,
      },
      {
        key: 'nav.matchmaking.new_proposal',
        navKey: 'mm_new_proposal',
        label: 'New Proposal',
        path: '/matchmaking/new',
      },
      {
        key: 'nav.matchmaking.review_queue',
        navKey: 'mm_review_queue',
        label: 'Review Queue',
        path: '/matchmaking/focal-point',
        end: true,
      },
      {
        key: 'nav.matchmaking.forwarded',
        navKey: 'mm_forwarded',
        label: 'Forwarded',
        path: '/matchmaking/forwarded',
        end: true,
      },
      {
        key: 'nav.matchmaking.matching_board',
        navKey: 'mm_matching_board',
        label: 'Matching Board',
        path: '/matchmaking/board',
      },
      {
        key: 'nav.matchmaking.all_matches',
        navKey: 'mm_matches',
        label: 'Matches',
        path: '/matchmaking/matches',
        end: true,
      },
    ],
  },
  {
    section: 'COMPLAINTS',
    permissions: [
      {
        key: 'nav.complaints.all',
        navKey: 'complaints_all',
        label: 'All Complaints',
        path: '/complaints',
      },
    ],
  },
  {
    section: 'ADMINISTRATION',
    permissions: [
      {
        key: 'nav.users.manage',
        navKey: 'users',
        label: 'Users',
        path: '/admin/users',
      },
      {
        key: 'nav.sectors.manage',
        navKey: 'sectors',
        label: 'Sectors',
        path: '/admin/sectors',
      },
      {
        key: 'nav.permissions.manage',
        navKey: 'permissions',
        label: 'Permissions',
        path: '/admin/permissions',
      },
      {
        key: 'nav.sector_lead.reassign',
        navKey: 'sector_lead_reassign',
        label: 'Sector Officer Change',
        path: '/dashboard/super-admin/sector-lead/handoff',
      },
      {
        key: 'nav.compliance.audit',
        navKey: 'compliance_audit',
        label: 'Audit & Annual Returns',
        path: '/dashboard/super-admin/compliance',
      },
    ],
  },
  {
    section: 'ACCOUNT',
    permissions: [
      {
        key: 'nav.account.change_password',
        navKey: 'change_password',
        label: 'Change Password',
        path: '/auth/change-password',
      },
    ],
  },
]

export const SIDEBAR_PERMISSION_TOTAL = SIDEBAR_PERMISSION_SECTIONS.reduce(
  (n, section) => n + section.permissions.length,
  0,
)

export const SIDEBAR_PRIMARY_KEYS = SIDEBAR_PERMISSION_SECTIONS.flatMap((section) =>
  section.permissions.map((p) => p.key),
)
