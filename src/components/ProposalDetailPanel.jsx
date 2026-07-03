import DocLink from './DocLink'
import MouConferenceDetailsSection from './proposal/MouConferenceDetailsSection'
import StatusBadge from './StatusBadge'
import {
  ENGAGEMENT_TYPES,
  FINANCIAL_METRICS,
  ENTITY_TYPES,
  fundUtilizationTotal,
  getProposalDisplayTitle,
} from '../constants/proposalTemplate'
import { resolveFileUrl } from '../utils/format'
import { formatDate } from '../utils/format'

export default function ProposalDetailPanel({ proposal, onOpenFile, conferences = [], onEditFields }) {
  if (!proposal) return null

  const open = (url, title) => onOpenFile?.(url, title)
  const title = getProposalDisplayTitle(proposal)
  const utilizationTotal = fundUtilizationTotal(proposal.investment_ask)

  return (
    <div className="space-y-6">
      {(proposal.cover_image_url || proposal.company_logo_url) && (
        <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
          {proposal.cover_image_url && (
            <img
              src={resolveFileUrl(proposal.cover_image_url)}
              alt="Cover"
              className="h-40 w-full object-cover sm:h-52"
            />
          )}
          {proposal.company_logo_url && (
            <div className={`${proposal.cover_image_url ? 'absolute bottom-3 left-4' : 'p-4'}`}>
              <img
                src={resolveFileUrl(proposal.company_logo_url)}
                alt="Company logo"
                className="h-14 w-14 rounded-lg border-2 border-white bg-white object-contain shadow sm:h-16 sm:w-16"
              />
            </div>
          )}
        </div>
      )}

      <MouConferenceDetailsSection
        proposal={proposal}
        conferences={conferences}
        onEdit={onEditFields}
      />

      <Section title="Engagement & Conference">
        <GridFields
          items={[
            [
              'Engagement Type',
              proposal.engagement_type
                ? ENGAGEMENT_TYPES.find((t) => t.value === proposal.engagement_type)?.label ||
                  proposal.engagement_type
                : null,
            ],
            ['Conference', proposal.conference_info?.conference_name],
            [
              'Conference Dates',
              proposal.conference_info?.conference_date
                ? [
                    proposal.conference_info.conference_date,
                    proposal.conference_info.conference_end_date,
                  ]
                    .filter(Boolean)
                    .join(' → ')
                : null,
            ],
            ['Location', proposal.conference_info?.conference_location],
            ['Host', proposal.conference_info?.conference_host],
            ['Description', proposal.conference_info?.conference_description],
          ]}
        />
      </Section>

      <div className="grid gap-4 lg:grid-cols-2">
        <InfoCard title="Party A" icon="🇵🇰" className="lg:col-span-1">
          <InfoRow
            label="Entity"
            value={
              ENTITY_TYPES.find((t) => t.value === proposal.party_a_info?.entity_type)?.label ||
              proposal.party_a_info?.entity_type
            }
          />
          <InfoRow label="Organization" value={proposal.party_a_info?.organization_name} />
          <InfoRow label="Department" value={proposal.party_a_info?.department_ministry} />
          <InfoRow label="Contact" value={proposal.party_a_info?.contact_name} />
          <InfoRow label="Designation" value={proposal.party_a_info?.designation} />
          <InfoRow label="Email" value={proposal.party_a_info?.email} />
          <InfoRow label="Phone" value={proposal.party_a_info?.phone} />
          <InfoRow label="Country" value={proposal.party_a_info?.country} />
          <InfoRow label="City" value={proposal.party_a_info?.city} />
        </InfoCard>

        <InfoCard title="Party B" icon="🤝" className="lg:col-span-1">
          <InfoRow
            label="Entity"
            value={
              ENTITY_TYPES.find((t) => t.value === proposal.party_b_entity_type)?.label ||
              proposal.party_b_entity_type
            }
          />
          <InfoRow label="Full name" value={proposal.party_b_name} />
          <InfoRow label="Organization" value={proposal.party_b_organization} />
          <InfoRow label="Email" value={proposal.party_b_email} />
          <InfoRow label="Phone" value={proposal.party_b_phone} />
          <InfoRow label="Country" value={proposal.party_b_country} />
        </InfoCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <InfoCard title="Cover & Identity" icon="🏢" className="lg:col-span-1">
          <InfoRow label="Company" value={proposal.company_name} />
          <InfoRow label="Venture" value={proposal.venture_name} />
          <InfoRow label="Sector" value={proposal.sector} />
          <InfoRow label="Project Type" value={proposal.project_type} />
          <InfoRow label="Status" value={<StatusBadge status={proposal.status} />} />
          {proposal.party_a_name && <InfoRow label="Party A" value={proposal.party_a_name} />}
          <InfoRow label="Submitted" value={formatDate(proposal.submitted_at || proposal.created_at)} />
        </InfoCard>

        <InfoCard title="MOU" icon="📄" className="lg:col-span-2">
          <InfoRow label="Sector" value={proposal.mou_sector} />
          <InfoRow label="Scope" value={proposal.mou_scope} />
          <InfoRow label="Demand" value={proposal.mou_demand} multiline />
          {proposal.sector_lead_comment && (
            <InfoRow label="Review note" value={proposal.sector_lead_comment} multiline />
          )}
        </InfoCard>
      </div>

      <Section title="Executive Summary">
        <GridFields
          items={[
            ['Company Overview', proposal.executive_summary?.company_overview],
            ['Project Overview', proposal.executive_summary?.project_overview],
            ['Segment', proposal.executive_summary?.project_segment],
            ['Sector Alignment', proposal.executive_summary?.sector_alignment],
            ['Investment Ask', proposal.executive_summary?.investment_ask_summary],
          ]}
        />
      </Section>

      <Section title="Company Overview">
        <GridFields
          items={[
            ['Years in Operation', proposal.company_overview?.years_in_operation],
            ['Market Standing', proposal.company_overview?.market_standing_pakistan],
            ['Certifications', proposal.company_overview?.key_certifications],
            ['Infrastructure & Assets', proposal.company_overview?.infrastructure_assets],
            ['Land / Capacity', proposal.company_overview?.land_project_capacity],
            ['Value Chain', proposal.company_overview?.value_chain_scope],
            ['What You Provide', proposal.company_overview?.local_provisions],
            ['Export Centricity', proposal.company_overview?.export_centricity],
          ]}
        />
      </Section>

      <Section title="Project Overview">
        <GridFields
          items={[
            ['Core Activity', proposal.project_overview?.core_activity],
            ['Site Location', proposal.project_overview?.site_location],
            ['Site Readiness', proposal.project_overview?.site_readiness_status],
            ['Chinese Technology', proposal.project_overview?.chinese_technology_sought],
            ['Value Addition', proposal.project_overview?.value_addition_goal],
            ['Production Capacity', proposal.project_overview?.target_production_capacity],
            ['Roadmap', proposal.project_overview?.phased_roadmap],
            ['Economic Impact', proposal.project_overview?.economic_impact],
            ['Sustainability', proposal.project_overview?.sustainability_metrics],
          ]}
        />
      </Section>

      {proposal.financials?.years?.length > 0 && (
        <Section title="Financials">
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 font-semibold text-slate-600">Metric</th>
                  {proposal.financials.years.map((y, i) => (
                    <th key={i} className="px-3 py-2 font-semibold text-slate-600">
                      {y.label || `Year ${i + 1}`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FINANCIAL_METRICS.map((m) => (
                  <tr key={m.key} className="border-t border-slate-100">
                    <td className="px-3 py-2 text-slate-700">
                      {m.label} <span className="text-slate-400">({m.unit})</span>
                    </td>
                    {proposal.financials.years.map((y, i) => (
                      <td key={i} className="px-3 py-2 text-slate-800">
                        {y.metrics?.[m.key] || '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {proposal.financials?.additional_rows?.length > 0 && (
            <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full text-left text-xs">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 font-semibold text-slate-600">Category</th>
                    <th className="px-3 py-2 font-semibold text-slate-600">Line Item</th>
                    {proposal.financials.years.map((y, i) => (
                      <th key={i} className="px-3 py-2 font-semibold text-slate-600">
                        {y.label || `Year ${i + 1}`}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {proposal.financials.additional_rows.map((row, idx) => (
                    <tr key={idx} className="border-t border-slate-100">
                      <td className="px-3 py-2 text-slate-700">{row.category || '—'}</td>
                      <td className="px-3 py-2 text-slate-800">{row.label || '—'}</td>
                      {proposal.financials.years.map((y, i) => (
                        <td key={i} className="px-3 py-2 text-slate-800">
                          {row.values?.[y.label] || '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      )}

      <Section title="Investment Ask">
        <GridFields
          items={[
            ['Total Project Cost (USD)', proposal.investment_ask?.total_project_cost_usd],
            ['Equity Ask (USD)', proposal.investment_ask?.investment_ask_equity_usd],
            ['Debt Ask (USD)', proposal.investment_ask?.investment_ask_debt_usd],
            ['Sponsor Contribution', proposal.investment_ask?.sponsor_contribution_amount],
            ['IRR %', proposal.investment_ask?.projected_irr_pct],
            ['Payback (years)', proposal.investment_ask?.payback_period_years],
            ['Phase 1', proposal.investment_ask?.milestone_phase_1],
            ['Phase 2', proposal.investment_ask?.milestone_phase_2],
            ['Phase 3', proposal.investment_ask?.milestone_phase_3],
            ['Sponsor (PKR Mn)', proposal.investment_ask?.sponsor_contribution_pkr_mn],
            ['Raising (PKR Mn)', proposal.investment_ask?.raising_from_investors_pkr_mn],
            ['Total Funds (PKR Mn)', proposal.investment_ask?.total_funds_required_pkr_mn],
            [
              'Fund Utilization',
              utilizationTotal
                ? `Technology ${proposal.investment_ask?.fund_utilization_technology_pct || 0}% · Infrastructure ${proposal.investment_ask?.fund_utilization_infrastructure_pct || 0}% · Working Capital ${proposal.investment_ask?.fund_utilization_working_capital_pct || 0}% (Total ${utilizationTotal}%)`
                : null,
            ],
          ]}
        />
      </Section>

      <Section title="Contact">
        <GridFields
          items={[
            ['Name', proposal.contact_info?.name],
            ['Designation', proposal.contact_info?.designation],
            ['Email', proposal.contact_info?.email],
            ['Cell', proposal.contact_info?.cell],
            ['WeChat', proposal.contact_info?.wechat],
          ]}
        />
      </Section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <FileCard label="Company Logo" url={proposal.company_logo_url} onOpen={open} title={title} />
        <FileCard label="Cover Image" url={proposal.cover_image_url} onOpen={open} title={title} />
        <FileCard label="Pitch Deck" url={proposal.proposal_file_url} onOpen={open} title={title} />
        <FileCard label="MOU Document" url={proposal.mou_file_url} onOpen={open} title={title} />
      </div>

      <DetailBlock title="MOU Description">
        <p className="text-sm leading-relaxed text-slate-700">{proposal.mou_description || '—'}</p>
      </DetailBlock>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-500">{title}</h4>
      {children}
    </div>
  )
}

function GridFields({ items }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map(([label, value]) => (
        <div key={label}>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{value || '—'}</p>
        </div>
      ))}
    </div>
  )
}

function InfoCard({ title, icon, children, className = '' }) {
  return (
    <div className={`overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>
      <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-3">
        <span className="text-base" aria-hidden>{icon}</span>
        <h4 className="text-sm font-semibold text-slate-800">{title}</h4>
      </div>
      <dl className="divide-y divide-slate-100 px-4 py-1">{children}</dl>
    </div>
  )
}

function InfoRow({ label, value, multiline }) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] gap-2 py-2.5 text-sm">
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className={`font-medium text-slate-800 ${multiline ? 'whitespace-pre-wrap' : 'truncate'}`}>
        {value || '—'}
      </dd>
    </div>
  )
}

function DetailBlock({ title, children }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</h4>
      {children}
    </div>
  )
}

function FileCard({ label, url, onOpen, title }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-800">{label}</p>
        <p className="truncate text-xs text-slate-500">{url ? 'Attached' : 'Not uploaded'}</p>
      </div>
      {url ? <DocLink url={url} title={`View ${label}`} onOpen={(u) => onOpen(u, `${label} — ${title}`)} /> : <span className="text-xs text-slate-400">—</span>}
    </div>
  )
}
