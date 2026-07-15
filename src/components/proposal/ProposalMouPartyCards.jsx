import { useAuth } from '../../context/AuthContext'
import {
  getPartyCardSkeletonFields,
} from '../../utils/proposalDisplay'
import { getPartyAProfilePaths, getPartyBProfilePaths } from '../../constants/profileRoutes'
import PartyProfileSnapshotCard, {
  PARTY_A_MANDATORY,
  PARTY_B_MANDATORY,
  PROFILE_BANNER,
} from './PartyProfileSnapshotCard'

export default function ProposalMouPartyCards({ proposal, onEditContacts, canEditContacts }) {
  const { user } = useAuth()
  const partyAPaths = getPartyAProfilePaths(user?.role)
  const partyBPaths = getPartyBProfilePaths(user?.role)

  const partyAFields = getPartyCardSkeletonFields(proposal, 'a')
  const partyBFields = getPartyCardSkeletonFields(proposal, 'b')
  const showSharedBanner = partyAFields.needsBanner || partyBFields.needsBanner

  const partyAViewId =
    proposal?.party_a_profile?.data?.user?.id ||
    (proposal?.party_a_profile?.linked ? proposal?.party_a_id : null)
  const partyBViewId =
    proposal?.party_b_profile?.data?.user?.id ||
    (proposal?.party_b_profile?.linked ? proposal?.party_b_user_id : null)

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
    <div className="space-y-4">
      {showSharedBanner && (
        <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-amber-900">{PROFILE_BANNER}</p>
          {editButton}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <PartyProfileSnapshotCard
          title="Pakistani Company"
          snapshot={proposal?.party_a_profile}
          fields={partyAFields}
          showBanner={false}
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
          fields={partyBFields}
          showBanner={false}
          mandatoryDocTypes={PARTY_B_MANDATORY}
          profileViewPath={
            proposal?.party_b_profile?.data && partyBViewId
              ? partyBPaths.detail(partyBViewId)
              : null
          }
          editContactsAction={editButton}
        />
      </div>
    </div>
  )
}
