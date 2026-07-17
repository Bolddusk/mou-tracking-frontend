import { useAuth } from '../../context/AuthContext'
import { getPartyCardSkeletonFields } from '../../utils/proposalDisplay'
import { getPartyAProfilePaths, getPartyBProfilePaths } from '../../constants/profileRoutes'
import PartyProfileSnapshotCard, {
  PARTY_A_MANDATORY,
  PARTY_B_MANDATORY,
  PROFILE_BANNER,
} from './PartyProfileSnapshotCard'

function EditContactsButton({ onClick, label = 'Edit contacts' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg bg-portal-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-portal-primary-hover"
    >
      {label}
    </button>
  )
}

export default function ProposalMouPartyCards({
  proposal,
  canEditPartyAContacts = false,
  canEditPartyBContacts = false,
  onEditPartyAContacts,
  onEditPartyBContacts,
}) {
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

  const editPartyA =
    canEditPartyAContacts && onEditPartyAContacts ? (
      <EditContactsButton onClick={onEditPartyAContacts} />
    ) : null

  const editPartyB =
    canEditPartyBContacts && onEditPartyBContacts ? (
      <EditContactsButton onClick={onEditPartyBContacts} />
    ) : null

  const bannerEdit =
    editPartyA || editPartyB ? (
      <EditContactsButton
        onClick={() => {
          if (canEditPartyAContacts) onEditPartyAContacts?.()
          else onEditPartyBContacts?.()
        }}
        label={
          canEditPartyAContacts && !canEditPartyBContacts
            ? 'Edit my contacts'
            : 'Edit contacts'
        }
      />
    ) : null

  return (
    <div className="space-y-4">
      {showSharedBanner && (
        <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-amber-900">{PROFILE_BANNER}</p>
          {bannerEdit}
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
          editContactsAction={editPartyA}
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
          editContactsAction={editPartyB}
        />
      </div>
    </div>
  )
}
