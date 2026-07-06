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

export function buildCredentialPrompts(partyA, partyB) {
  const prompts = []
  if (partyA?.credentials) {
    prompts.push({
      title: 'Party A login credentials',
      credentials: partyA.credentials,
      subtitle: partyA.email_sent
        ? 'Party A account created — credentials were also emailed.'
        : 'Party A account created — share login credentials with Party A.',
    })
  }
  if (partyB?.credentials) {
    prompts.push({
      title: 'Party B login credentials',
      credentials: partyB.credentials,
      subtitle: partyB.email_sent
        ? 'Party B account created — credentials were also emailed.'
        : 'Party B account created — share login credentials with Party B.',
    })
  }
  return prompts
}

export function getPartyContactSaveFeedback(res) {
  const errors = []
  const extras = []
  const pa = res.party_a

  if (pa?.skipped && pa.reason === 'email_belongs_to_non_party_a_user') {
    errors.push('This email belongs to another role. Use a different Party A email.')
  } else if (pa?.linked && pa.email_sent) {
    extras.push('Party A invite email sent')
  } else if (pa?.linked) {
    extras.push('Party A account linked')
  }

  const pb = res.party_b
  if (pb?.linked && pb.email_sent && !pb.credentials) {
    extras.push('Party B invite email sent')
  } else if (pb?.linked && !pb.credentials) {
    extras.push('Party B account linked')
  }

  const base = res.message || 'Party contact details updated successfully'
  const success =
    errors.length === 0
      ? [base, ...extras].filter(Boolean).join(' · ')
      : base

  return { success, errors }
}

export function needsPartyAAccountSetup(proposal) {
  const info = proposal?.party_a_info || {}
  return !info.email?.trim() || !info.contact_name?.trim()
}
