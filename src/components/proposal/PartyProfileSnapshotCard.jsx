import { Link } from 'react-router-dom'
import { resolveFileUrl } from '../../utils/format'

const PARTY_A_MANDATORY = [
  { key: 'fbr_certificate', label: 'FBR Taxpayer Registration Certificate' },
  { key: 'secp_certificate', label: 'SECP Certificate of Incorporation' },
]

const PARTY_B_MANDATORY = [
  { key: 'business_license', label: 'Business License' },
  { key: 'registration_certificate', label: 'Company Registration Certificate' },
]

function CompletionBadge({ completion }) {
  if (!completion) return null
  if (completion.profile_complete) {
    return (
      <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800 ring-1 ring-green-200">
        Complete ✓
      </span>
    )
  }
  const pct = completion.completion_pct ?? 0
  return (
    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900 ring-1 ring-amber-200">
      {pct}% complete
    </span>
  )
}

function ContactRow({ label, value }) {
  if (!value) return null
  return (
    <p className="text-sm text-slate-600">
      <span className="font-medium text-slate-700">{label}:</span> {value}
    </p>
  )
}

function DocLink({ doc }) {
  if (!doc?.file_url) {
    return <span className="text-xs text-slate-400">Not uploaded</span>
  }
  return (
    <a
      href={resolveFileUrl(doc.file_url)}
      target="_blank"
      rel="noopener noreferrer"
      className="text-xs font-medium text-portal-primary hover:underline"
    >
      {doc.original_filename || 'View document'}
    </a>
  )
}

export default function PartyProfileSnapshotCard({
  title,
  snapshot,
  fallbackContacts = [],
  mandatoryDocTypes = PARTY_A_MANDATORY,
  profileViewPath,
  editContactsAction,
}) {
  const data = snapshot?.data
  const profile = data?.profile || {}
  const completion = data?.completion
  const user = data?.user
  const documents = data?.documents || []

  const getMandatoryDoc = (docType) => {
    const fromCompletion = completion?.mandatory_documents?.[docType]
    const fromList = documents.find((d) => d.doc_type === docType)
    if (!fromCompletion && !fromList) return null
    return {
      ...fromList,
      ...fromCompletion,
      file_url: fromCompletion?.file_url || fromList?.file_url,
      original_filename: fromCompletion?.original_filename || fromList?.original_filename,
    }
  }

  return (
    <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        {data && <CompletionBadge completion={completion} />}
      </div>

      <div className="flex flex-1 flex-col gap-3 px-4 py-4">
        {snapshot?.reason && !data && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            {snapshot.reason}
          </div>
        )}

        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Proposal contacts
          </p>
          {fallbackContacts.length > 0 ? (
            fallbackContacts.map(({ label, value }) => (
              <ContactRow key={label} label={label} value={value} />
            ))
          ) : (
            <p className="text-sm text-slate-400">No contact details on proposal.</p>
          )}
        </div>

        {data && (
          <>
            <div className="space-y-1 border-t border-slate-100 pt-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Company profile
              </p>
              {profile.company_name && (
                <p className="text-sm font-medium text-slate-800">{profile.company_name}</p>
              )}
              {user?.full_name && <p className="text-sm text-slate-600">{user.full_name}</p>}
              {user?.email && <p className="text-sm text-slate-600">{user.email}</p>}
              {profile.country && (
                <p className="text-sm text-slate-600">Country: {profile.country}</p>
              )}
              {profile.address && <p className="text-sm text-slate-600">{profile.address}</p>}
              {profile.phone && <p className="text-sm text-slate-600">Phone: {profile.phone}</p>}
              {Array.isArray(profile.sectors) && profile.sectors.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {profile.sectors.map((s) => (
                    <span
                      key={s}
                      className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-800 ring-1 ring-green-200"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2 border-t border-slate-100 pt-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Documents
              </p>
              {mandatoryDocTypes.map(({ key, label }) => {
                const doc = getMandatoryDoc(key)
                return (
                  <div key={key} className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs text-slate-600">{label}</span>
                    <DocLink doc={doc} />
                  </div>
                )
              })}
            </div>

            {completion?.missing_fields?.length > 0 && !completion.profile_complete && (
              <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800">
                <p className="font-medium">Missing:</p>
                <ul className="mt-1 list-inside list-disc">
                  {completion.missing_fields.slice(0, 4).map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                  {completion.missing_fields.length > 4 && (
                    <li>+{completion.missing_fields.length - 4} more</li>
                  )}
                </ul>
              </div>
            )}

            {data.read_only && (
              <p className="text-[10px] text-slate-400">Read-only snapshot from linked account</p>
            )}
          </>
        )}

        {snapshot?.linked && !data && (
          <p className="text-sm text-slate-500">Account linked — profile not yet completed.</p>
        )}

        <div className="mt-auto flex flex-wrap gap-2 pt-2">
          {profileViewPath && (
            <Link
              to={profileViewPath}
              className="rounded-lg border border-portal-primary/30 px-3 py-1.5 text-xs font-semibold text-portal-primary hover:bg-green-50"
            >
              View full profile
            </Link>
          )}
          {editContactsAction}
        </div>
      </div>
    </div>
  )
}

export { PARTY_A_MANDATORY, PARTY_B_MANDATORY }
