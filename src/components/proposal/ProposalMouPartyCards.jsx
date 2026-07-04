import { useAuth } from '../../context/AuthContext'
import { getChineseCompanyDisplay, getPakistaniCompanyDisplay } from '../../utils/proposalDisplay'
import { getPartyAProfilePaths, getPartyBProfilePaths } from '../../constants/profileRoutes'
import PartyProfileSnapshotCard, {
  PARTY_A_MANDATORY,
  PARTY_B_MANDATORY,
} from './PartyProfileSnapshotCard'

export default function ProposalMouPartyCards({ proposal, onEditContacts, canEditContacts }) {
  const { user } = useAuth()
  const partyAPaths = getPartyAProfilePaths(user?.role)
  const partyBPaths = getPartyBProfilePaths(user?.role)

  const partyAViewId =
    proposal?.party_a_profile?.data?.user?.id ||
    (proposal?.party_a_profile?.linked ? proposal?.party_a_id : null)
  const partyBViewId =
    proposal?.party_b_profile?.data?.user?.id ||
    (proposal?.party_b_profile?.linked ? proposal?.party_b_user_id : null)

  const partyAFallback = [
    {
      label: 'Company',
      value: getPakistaniCompanyDisplay(proposal),
    },
    {
      label: 'Contact',
      value: proposal?.party_a_info?.contact_name,
    },
    {
      label: 'Organization',
      value: proposal?.party_a_info?.organization_name || proposal?.party_a_organization,
    },
    { label: 'Email', value: proposal?.party_a_info?.email || proposal?.party_a_email },
    { label: 'Phone', value: proposal?.party_a_info?.phone || proposal?.party_a_phone },
  ].filter((r) => r.value)

  const partyBFallback = [
    { label: 'Company', value: getChineseCompanyDisplay(proposal) },
    { label: 'Contact', value: proposal?.party_b_name },
    { label: 'Organization', value: proposal?.party_b_organization },
    { label: 'Email', value: proposal?.party_b_email },
    { label: 'Phone', value: proposal?.party_b_phone },
    { label: 'Country', value: proposal?.party_b_country },
  ].filter((r) => r.value)

  const editButton =
    canEditContacts && onEditContacts ? (
      <button
        type="button"
        onClick={onEditContacts}
        className="rounded-lg bg-portal-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-portal-primary-hover"
      >
        Edit contacts
      </button>
    ) : null

  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <PartyProfileSnapshotCard
        title="Pakistani Company"
        snapshot={proposal?.party_a_profile}
        fallbackContacts={partyAFallback}
        mandatoryDocTypes={PARTY_A_MANDATORY}
        profileViewPath={
          proposal?.party_a_profile?.data && partyAViewId
            ? partyAPaths.detail(partyAViewId)
            : null
        }
        editContactsAction={editButton}
      />
      <PartyProfileSnapshotCard
        title="Chinese Company"
        snapshot={proposal?.party_b_profile}
        fallbackContacts={partyBFallback}
        mandatoryDocTypes={PARTY_B_MANDATORY}
        profileViewPath={
          proposal?.party_b_profile?.data && partyBViewId
            ? partyBPaths.detail(partyBViewId)
            : null
        }
        editContactsAction={editButton}
      />
    </section>
  )
}
