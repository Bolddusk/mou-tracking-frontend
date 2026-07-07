import {
  formatSifcProgressCell,
  normalizeProposalSifcReport,
} from '../../utils/proposalSifcReport'

const EXCEL_BORDER = 'border border-slate-800'
const EXCEL_YELLOW = 'bg-[#fff200]'
const EXCEL_LABEL_GREEN = 'bg-[#c5e0b4]'
const EXCEL_HEADER_GREEN = 'bg-[#548235] text-white'

function ExcelSheetTab({ label, active = false }) {
  return (
    <span
      className={`inline-block border border-b-0 border-slate-400 px-3 py-1 text-xs font-semibold ${
        active ? 'bg-white text-slate-900' : 'bg-slate-200 text-slate-600'
      }`}
    >
      {label}
    </span>
  )
}

function MouDetailsSheet({ title, subtitle, fields }) {
  return (
    <section className="overflow-hidden bg-white font-serif text-slate-900 shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] max-w-[900px] border-collapse text-sm">
          <tbody>
            <tr>
              <td
                colSpan={2}
                className={`${EXCEL_BORDER} ${EXCEL_YELLOW} px-3 py-2 text-center text-sm font-bold`}
              >
                {title}
              </td>
            </tr>
            {subtitle && (
              <tr>
                <td
                  colSpan={2}
                  className={`${EXCEL_BORDER} ${EXCEL_YELLOW} px-3 py-1.5 text-center text-sm font-semibold`}
                >
                  {subtitle}
                </td>
              </tr>
            )}
            {fields.map((field, index) => (
              <tr key={`${field.label}-${index}`}>
                <td
                  className={`${EXCEL_BORDER} ${EXCEL_LABEL_GREEN} w-[220px] px-3 py-1.5 align-top font-semibold text-slate-900`}
                >
                  {field.label}
                </td>
                <td className={`${EXCEL_BORDER} bg-white px-3 py-1.5 align-top text-slate-900`}>
                  <span className="whitespace-pre-wrap break-words">{field.value}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-0 border-t border-slate-300 bg-slate-100 px-2 pt-1">
        <ExcelSheetTab label="MOU Details" active />
        <ExcelSheetTab label="Progress" />
      </div>
    </section>
  )
}

function ProgressSheet({ sheetTitle, columns, rows }) {
  return (
    <section className="overflow-hidden bg-white font-serif text-slate-900 shadow-sm">
      <div className={`${EXCEL_BORDER} border-b-0 ${EXCEL_YELLOW} py-2 text-center text-base font-bold`}>
        {sheetTitle}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1040px] border-collapse text-xs">
          <thead>
            <tr className={`${EXCEL_HEADER_GREEN} text-center font-semibold`}>
              {columns.map((col) => (
                <th key={col.key} className={`${EXCEL_BORDER} px-2 py-2`}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={row.id ?? rowIndex} className="bg-white">
                {columns.map((col) => {
                  const cell = formatSifcProgressCell(col.key, row[col.key])
                  const isMultiline =
                    col.key === 'comments' ||
                    col.key === 'description' ||
                    col.key === 'synced_fields'

                  return (
                    <td
                      key={col.key}
                      className={`${EXCEL_BORDER} px-2 py-1.5 align-top text-slate-900 ${
                        isMultiline ? 'min-w-[140px] max-w-[260px]' : ''
                      } ${col.key === 'progress_date' ? 'whitespace-nowrap' : ''}`}
                    >
                      <span
                        className={isMultiline ? 'whitespace-pre-wrap break-words' : 'break-words'}
                      >
                        {cell}
                      </span>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-0 border-t border-slate-300 bg-slate-100 px-2 pt-1">
        <ExcelSheetTab label="MOU Details" />
        <ExcelSheetTab label="Progress" active />
      </div>
    </section>
  )
}

export default function ProposalSifcReportView({ report, displayTitle }) {
  const normalized = normalizeProposalSifcReport(report, displayTitle)

  if (normalized.isLegacy) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-8 text-center text-sm text-amber-900">
        This preview uses an outdated conference-style format. Close and open{' '}
        <strong>Preview SIFC report</strong> again, or download Excel for the latest layout.
      </div>
    )
  }

  const { mouFields, progressColumns, progressRows, meta, mouSheet } = normalized

  return (
    <article className="mx-auto max-w-[1100px] space-y-8">
      <MouDetailsSheet
        title={mouSheet.title || displayTitle || meta.title}
        subtitle={mouSheet.subtitle}
        fields={mouFields}
      />

      {progressRows.length > 0 ? (
        <ProgressSheet
          sheetTitle={meta.progressSheetTitle}
          columns={progressColumns}
          rows={progressRows}
        />
      ) : (
        <section className="overflow-hidden bg-white shadow-sm">
          <div className={`${EXCEL_BORDER} ${EXCEL_YELLOW} py-2 text-center text-base font-bold`}>
            Progress Updates (0)
          </div>
          <p className={`${EXCEL_BORDER} border-t-0 px-4 py-6 text-center text-sm text-slate-500`}>
            No progress entries in this report.
          </p>
        </section>
      )}
    </article>
  )
}
