/** Route paths for Super Admin matchmaking oversight vs role-specific routes. */
export const ADMIN_MM = {
  myProposals: '/matchmaking/admin/my-proposals',
  focalPoint: '/matchmaking/admin/focal-point',
  forwarded: '/matchmaking/admin/forwarded',
  board: '/matchmaking/admin/board',
  matches: '/matchmaking/admin/matches',
  matchDetail: (id) => `/matchmaking/admin/matches/${id}`,
  proposalDetail: (id) => `/matchmaking/admin/${id}`,
  newProposal: '/matchmaking/new',
}

export const SL_MM = {
  myProposals: '/matchmaking/my-proposals',
  focalPoint: '/matchmaking/focal-point',
  forwarded: '/matchmaking/forwarded',
  board: '/matchmaking/board',
  matches: '/matchmaking/matches',
  matchDetail: (id) => `/matchmaking/matches/${id}`,
  proposalDetail: (id) => `/matchmaking/${id}`,
  newProposal: '/matchmaking/new',
}

export const FP_MM = {
  focalPoint: '/matchmaking/focal-point',
  proposalDetail: (id) => `/matchmaking/${id}`,
}

export function getMmPaths(adminOversight) {
  return adminOversight ? ADMIN_MM : SL_MM
}
