import {
  buildScopeLabel,
  buildSectorLabel,
  formatAgreementType,
  formatReportAmount,
  formatReportCell,
} from '../../utils/conferenceReportFormat'

function SnapshotTable({ rows = [] }) {
  if (!rows.length) {
    return <p className="py-6 text-center text-sm text-slate-500">No snapshot data.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[960px] border-collapse text-xs sm:text-sm">
        <thead>
          <tr className="bg-[#fff200] text-center font-bold text-slate-900">
            <th className="border border-slate-800 px-2 py-2" rowSpan={2}>
              Category
            </th>
            <th className="border border-slate-800 px-2 py-2" rowSpan={2}>
              Agreements
            </th>
            <th className="border border-slate-800 px-2 py-2" rowSpan={2}>
              No.
            </th>
            <th className="border border-slate-800 px-2 py-2" rowSpan={2}>
              Total Value
              <br />
              (USD Million)
            </th>
            <th className="border border-slate-800 px-2 py-2" colSpan={2}>
              In Execution
            </th>
            <th className="border border-slate-800 px-2 py-2" colSpan={2}>
              Active
            </th>
            <th className="border border-slate-800 px-2 py-2" colSpan={2}>
              Inactive
            </th>
          </tr>
          <tr className="bg-[#c5e0b4] text-center font-semibold text-slate-900">
            <th className="border border-slate-800 px-2 py-1">No.</th>
            <th className="border border-slate-800 px-2 py-1">Amount</th>
            <th className="border border-slate-800 px-2 py-1">No.</th>
            <th className="border border-slate-800 px-2 py-1">Amount</th>
            <th className="border border-slate-800 px-2 py-1">No.</th>
            <th className="border border-slate-800 px-2 py-1">Amount</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const isGrand = row.row_type === 'grand_total'
            const isSubtotal = row.row_type === 'subtotal'
            const rowClass = isGrand
              ? 'bg-[#fff200] font-bold'
              : isSubtotal
                ? 'bg-slate-100 font-semibold'
                : 'bg-white'

            const categoryLabel =
              row.row_type === 'grand_total'
                ? 'Grand Total'
                : row.row_type === 'subtotal'
                  ? row.label || 'Subtotal'
                  : [row.category, row.sub_category].filter(Boolean).join(' — ') || '—'

            const agreementLabel =
              row.row_type === 'data' ? formatAgreementType(row.agreement_type) : ''

            return (
              <tr key={`${row.row_type}-${idx}`} className={rowClass}>
                <td className="border border-slate-800 px-2 py-1.5 text-left">{categoryLabel}</td>
                <td className="border border-slate-800 px-2 py-1.5 text-center">{agreementLabel}</td>
                <td className="border border-slate-800 px-2 py-1.5 text-center">
                  {row.total_count ?? '—'}
                </td>
                <td className="border border-slate-800 px-2 py-1.5 text-center">
                  {formatReportAmount(row.total_value_usd_m)}
                </td>
                <td className="border border-slate-800 px-2 py-1.5 text-center">
                  {row.in_execution?.count ?? '—'}
                </td>
                <td className="border border-slate-800 px-2 py-1.5 text-center">
                  {formatReportAmount(row.in_execution?.amount_usd_m)}
                </td>
                <td className="border border-slate-800 px-2 py-1.5 text-center">
                  {row.active?.count ?? '—'}
                </td>
                <td className="border border-slate-800 px-2 py-1.5 text-center">
                  {formatReportAmount(row.active?.amount_usd_m)}
                </td>
                <td className="border border-slate-800 px-2 py-1.5 text-center">
                  {row.inactive?.count ?? '—'}
                </td>
                <td className="border border-slate-800 px-2 py-1.5 text-center">
                  {formatReportAmount(row.inactive?.amount_usd_m)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function DetailSection({ title, variant, rows = [] }) {
  const isExecution = variant === 'in_execution'

  if (!rows.length) return null

  return (
    <section className="mt-8 break-before-page print:mt-6">
      <div className="bg-[#fff200] py-2 text-center text-base font-bold text-slate-900">{title}</div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1200px] border-collapse text-xs">
          <thead>
            <tr className="bg-[#548235] text-center font-semibold text-white">
              <th className="border border-slate-800 px-2 py-2 w-10">Sr. No</th>
              <th className="border border-slate-800 px-2 py-2 min-w-[120px]">Pak. company</th>
              <th className="border border-slate-800 px-2 py-2 min-w-[120px]">Chinese company</th>
              <th className="border border-slate-800 px-2 py-2 min-w-[90px]">Sector</th>
              <th className="border border-slate-800 px-2 py-2 min-w-[100px]">
                MoU Value (USD M)
                {!isExecution && ' / location'}
              </th>
              <th className="border border-slate-800 px-2 py-2 min-w-[120px]">
                {isExecution ? 'Outcome' : 'Product'}
              </th>
              <th className="border border-slate-800 px-2 py-2 min-w-[200px]">Status/Feedback</th>
              <th className="border border-slate-800 px-2 py-2 min-w-[120px]">Bottleneck</th>
              <th className="border border-slate-800 px-2 py-2 min-w-[90px]">Tentative Timelines</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const valueCell =
                [row.value_label, row.location].filter(Boolean).join('\n') ||
                formatReportAmount(row.mou_value_usd_m)
              const descriptionCell = isExecution ? row.outcome : row.product

              return (
                <tr key={row.sr} className="align-top bg-white">
                  <td className="border border-slate-800 px-2 py-2 text-center">{row.sr}</td>
                  <td className="border border-slate-800 px-2 py-2">
                    {formatReportCell(row.pak_company)}
                  </td>
                  <td className="border border-slate-800 px-2 py-2">
                    {formatReportCell(row.chinese_company)}
                  </td>
                  <td className="border border-slate-800 px-2 py-2">
                    {formatReportCell(row.sector)}
                  </td>
                  <td className="border border-slate-800 px-2 py-2 whitespace-pre-wrap text-center">
                    {formatReportCell(valueCell)}
                  </td>
                  <td className="border border-slate-800 px-2 py-2">
                    {formatReportCell(descriptionCell)}
                  </td>
                  <td className="border border-slate-800 px-2 py-2 whitespace-pre-wrap">
                    {formatReportCell(row.status_feedback)}
                  </td>
                  <td className="border border-slate-800 px-2 py-2 whitespace-pre-wrap">
                    {formatReportCell(row.bottlenecks)}
                  </td>
                  <td className="border border-slate-800 px-2 py-2 text-center whitespace-pre-wrap">
                    {formatReportCell(row.tentative_timeline)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default function ConferenceReportView({ report }) {
  if (!report) return null

  const { conference, scope, generated_at, proposal_count, snapshot, sections } = report
  const sectorLabel = buildSectorLabel(scope)
  const scopeLabel = buildScopeLabel(scope)
  const conferenceLabel =
    conference?.name || conference?.report_title || conference?.key || 'All conferences'

  return (
    <article className="conference-report mx-auto max-w-[1200px] bg-white p-4 font-serif text-slate-900 sm:p-8 print:p-0">
      <header className="mb-6 text-center print:mb-4">
        <h1 className="text-lg font-bold sm:text-xl">
          {conference?.report_title || conference?.name || 'Conference MOU Report'}
        </h1>
        {conference?.name && conference?.report_title && (
          <p className="mt-1 text-sm text-slate-600">{conference.name}</p>
        )}
        <p className="mt-2 text-xs text-slate-500 print:text-[10px]">
          {conferenceLabel}
          {proposal_count != null ? ` · ${proposal_count} MOUs` : ''}
          {` · ${sectorLabel}`}
        </p>
        <div className="mt-1 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-slate-500 print:text-[10px]">
          {scopeLabel && scopeLabel !== sectorLabel && <span>{scopeLabel}</span>}
          {generated_at && <span>Generated {new Date(generated_at).toLocaleString()}</span>}
        </div>
      </header>

      <section>
        <SnapshotTable rows={snapshot?.rows || []} />
      </section>

      <DetailSection title="MoUs in Execution" variant="in_execution" rows={sections?.in_execution || []} />
      <DetailSection title="MoUs (Active)" variant="active" rows={sections?.active || []} />
      <DetailSection title="MoUs (Inactive)" variant="inactive" rows={sections?.inactive || []} />
    </article>
  )
}
