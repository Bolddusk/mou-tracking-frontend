export function mergeProposalAfterPartyContacts(prev, res) {
  if (!prev) return prev
  const updated = res.proposal || {}
  return {
    ...prev,
    ...updated,
    party_a_info: { ...prev.party_a_info, ...updated.party_a_info },
    party_b_info: { ...prev.party_b_info, ...updated.party_b_info },
    party_a_id: updated.party_a_id ?? prev.party_a_id,
    party_a_name: updated.party_a_name ?? prev.party_a_name,
    party_a_email: updated.party_a_email ?? prev.party_a_email,
    party_b_user_id: updated.party_b_user_id ?? prev.party_b_user_id,
    party_a_contacts_display: updated.party_a_contacts_display ?? prev.party_a_contacts_display,
    party_b_contacts_display: updated.party_b_contacts_display ?? prev.party_b_contacts_display,
    party_a_profile: updated.party_a_profile ?? prev.party_a_profile,
    party_b_profile: updated.party_b_profile ?? prev.party_b_profile,
    capabilities: res.capabilities ?? prev.capabilities,
  }
}

/** New account only — never open modal when existing_account or credentials missing. */
export function shouldShowCredentialsModal(party) {
  return Boolean(party?.account_created && party?.credentials)
}

export function getExistingAccountMessage(side = 'A') {
  const label = side === 'B' ? 'Party B' : 'Party A'
  return `Existing ${label} account linked. They can use their current login.`
}

/**
 * Credentials modal prompts for newly created accounts only.
 * Existing-account toasts are returned via getPartyLinkNotices().
 */
export function buildCredentialPrompts(partyA, partyB) {
  const prompts = []
  if (shouldShowCredentialsModal(partyA)) {
    prompts.push({
      side: 'A',
      title: 'Party A login credentials',
      credentials: partyA.credentials,
      subtitle: partyA.email_sent
        ? 'Party A account created — credentials were also emailed.'
        : 'Party A account created — share login credentials with Party A.',
    })
  }
  if (shouldShowCredentialsModal(partyB)) {
    prompts.push({
      side: 'B',
      title: 'Party B login credentials',
      credentials: partyB.credentials,
      subtitle: partyB.email_sent
        ? 'Party B account created — credentials were also emailed.'
        : 'Party B account created — share login credentials with Party B.',
    })
  }
  return prompts
}

/** Soft success lines when an existing account was linked (no new password). */
export function getExistingAccountNotices(partyA, partyB) {
  const notices = []
  if (partyA?.existing_account && !shouldShowCredentialsModal(partyA)) {
    notices.push(getExistingAccountMessage('A'))
  }
  if (partyB?.existing_account && !shouldShowCredentialsModal(partyB)) {
    notices.push(getExistingAccountMessage('B'))
  }
  return notices
}

export function getPartyContactSaveFeedback(res) {
  const errors = []
  const extras = []
  const pa = res.party_a
  const pb = res.party_b

  if (pa?.skipped && pa.reason === 'email_belongs_to_non_party_a_user') {
    errors.push('This email belongs to another role. Use a different Party A email.')
  } else if (pa?.existing_account) {
    extras.push(getExistingAccountMessage('A'))
  } else if (pa?.account_created) {
    extras.push(
      pa.email_sent
        ? 'Party A account created — invite emailed'
        : 'Party A account created — share login credentials',
    )
  } else if (pa?.linked && pa.email_sent) {
    extras.push('Party A invite email sent')
  } else if (pa?.linked) {
    extras.push('Party A account linked')
  }

  if (pb?.existing_account) {
    extras.push(getExistingAccountMessage('B'))
  } else if (pb?.account_created) {
    extras.push(
      pb.email_sent
        ? 'Party B account created — invite emailed'
        : 'Party B account created — share login credentials',
    )
  } else if (pb?.linked && pb.email_sent && !pb.credentials) {
    extras.push('Party B invite email sent')
  } else if (pb?.linked && !pb.credentials) {
    extras.push('Party B account linked')
  }

  const base = res.message || 'Party contact details updated successfully'
  const success =
    errors.length === 0 ? [base, ...extras].filter(Boolean).join(' · ') : base

  return { success, errors }
}

export function needsPartyAAccountSetup(proposal) {
  const info = proposal?.party_a_info || {}
  return !info.email?.trim() || !info.contact_name?.trim()
}
