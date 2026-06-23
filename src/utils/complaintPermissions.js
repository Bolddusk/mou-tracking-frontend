export function canRfpActOnComplaint(complaint, userId) {
  return (
    complaint?.status === 'forwarded' && complaint?.forwarded_to === userId
  )
}

export function canSectorLeadActOnComplaint(complaint, userId) {
  return (
    complaint?.tagged_sector_lead === userId &&
    complaint?.status !== 'forwarded' &&
    ['open', 'under_review', 'returned_to_sector_lead'].includes(complaint?.status)
  )
}

export function canSuperAdminActOnComplaint(complaint) {
  return ['open', 'under_review', 'returned_to_sector_lead'].includes(complaint?.status)
}

export function canPostInternalTimeline(complaint) {
  return ['forwarded', 'returned_to_sector_lead'].includes(complaint?.status)
}

export function canSectorLeadForward(complaint, userId) {
  return (
    complaint?.tagged_sector_lead === userId &&
    ['open', 'under_review', 'returned_to_sector_lead'].includes(complaint?.status)
  )
}
