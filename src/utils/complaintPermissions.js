export function canRfpActOnComplaint(complaint, userId) {
  return (
    complaint?.status === 'forwarded' &&
    Number(complaint?.forwarded_to) === Number(userId)
  )
}

export function canSectorLeadActOnComplaint(complaint, userId) {
  return (
    Number(complaint?.tagged_sector_lead) === Number(userId) &&
    ['open', 'under_review', 'escalated'].includes(complaint?.status)
  )
}

export function canSuperAdminActOnComplaint(complaint) {
  return ['open', 'under_review', 'escalated'].includes(complaint?.status)
}

/** Prefer API capabilities when present; else fall back to role helpers. */
export function getComplaintActionFlags(
  complaint,
  { userId, isSectorLead, isSuperAdmin, isRegionalFocalPoint },
) {
  const caps = complaint?.capabilities
  if (caps && typeof caps === 'object') {
    return {
      canApprove: caps.can_approve === true,
      canReject: caps.can_reject === true,
      canComment: caps.can_comment === true,
      canEscalate: caps.can_escalate === true,
      canReopen: caps.can_reopen === true,
      canForward: false,
    }
  }

  const canReview =
    (isSectorLead && canSectorLeadActOnComplaint(complaint, userId)) ||
    (isRegionalFocalPoint && canRfpActOnComplaint(complaint, userId)) ||
    (isSuperAdmin && canSuperAdminActOnComplaint(complaint))

  return {
    canApprove: canReview,
    canReject: canReview,
    canComment: Boolean(complaint) && (isSectorLead || isSuperAdmin),
    canEscalate: canReview || Boolean(complaint),
    canReopen: complaint?.status === 'rejected',
    canForward: false,
  }
}
