import { Link } from 'react-router-dom'
import { clearFormState } from '../../utils/proposalDraft'

function PathCard({ badge, title, when, tagline, rows, ctaLabel, ctaTo, ctaOnClick, variant = 'direct' }) {
  const isDirect = variant === 'direct'

  return (
    <div
      className={`flex flex-col rounded-xl border p-5 shadow-sm ${
        isDirect
          ? 'border-portal-primary/30 bg-white'
          : 'border-green-300/40 bg-gradient-to-br from-green-50/80 to-white'
      }`}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest ${
            isDirect ? 'bg-portal-primary/15 text-portal-primary' : 'bg-green-200/80 text-green-900'
          }`}
        >
          {badge}
        </span>
        <h4 className="text-base font-semibold text-slate-800">{title}</h4>
      </div>

      <p className="text-sm font-medium text-slate-700">{when}</p>
      <p className="mt-2 text-sm italic text-slate-600">&ldquo;{tagline}&rdquo;</p>

      <dl className="mt-4 space-y-2 text-sm">
        {rows.map(({ label, value }) => (
          <div key={label} className="flex gap-2">
            <dt className="shrink-0 font-medium text-slate-500">{label}:</dt>
            <dd className="text-slate-700">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-5 flex-1" />

      {ctaOnClick ? (
        <button
          type="button"
          onClick={ctaOnClick}
          className={`mt-4 inline-flex w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold ${
            isDirect
              ? 'bg-portal-primary text-white hover:bg-portal-primary-hover'
              : 'bg-green-800 text-white hover:bg-green-900'
          }`}
        >
          {ctaLabel}
        </button>
      ) : (
        <Link
          to={ctaTo}
          className={`mt-4 inline-flex w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold ${
            isDirect
              ? 'bg-portal-primary text-white hover:bg-portal-primary-hover'
              : 'bg-green-800 text-white hover:bg-green-900'
          }`}
        >
          {ctaLabel}
        </Link>
      )}
    </div>
  )
}

export default function PartyASubmissionPaths({ onDirectMous, compact = false }) {
  const handleDirectClick = () => {
    clearFormState()
    onDirectMous?.()
  }

  return (
    <section className={compact ? 'space-y-3' : 'space-y-4'}>
      {!compact && (
        <div>
          <h3 className="text-lg font-semibold text-slate-800">Choose your submission path</h3>
          <p className="text-sm text-slate-500">
            Direct MOUS and Matchmaking use different forms and review flows — pick the one that
            matches your situation.
          </p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <PathCard
          variant="direct"
          badge="Direct"
          title="Add MOUS"
          when="Use when you already have a Chinese partner (e.g. from a conference) and your MOU is ready."
          tagline="Hamara MOU tayyar hai, bas government review chahiye."
          rows={[
            { label: 'Party B', value: 'Enter in form — required before submit' },
            { label: 'MOU', value: 'Upload before submit' },
            { label: 'Steps', value: '11 steps (engagement, Party A/B, pitch, MOU)' },
            {
              label: 'Next',
              value: 'Sector Lead approves → Party B account → chat / MOU',
            },
          ]}
          ctaLabel="Add MOUS →"
          ctaTo="/proposals/new"
          ctaOnClick={onDirectMous ? handleDirectClick : undefined}
        />

        <PathCard
          variant="matchmaking"
          badge="Matchmaking"
          title="New Proposal"
          when="Use when you are looking for an investment partner — the portal will match you across countries."
          tagline="We have an opportunity and need a partner matched through the portal."
          rows={[
            { label: 'Party B', value: 'Not required at submit' },
            { label: 'MOU', value: 'After Sector Lead creates a match' },
            { label: 'Fields', value: 'Country, sector, title, investment amount, keywords' },
            {
              label: 'Next',
              value: 'Focal point review → forward → sector lead match → engagement + MOU',
            },
          ]}
          ctaLabel="New Proposal (Matchmaking) →"
          ctaTo="/matchmaking/new"
        />
      </div>
    </section>
  )
}
