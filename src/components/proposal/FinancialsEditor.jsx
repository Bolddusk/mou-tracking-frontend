import { Fragment } from 'react'
import { FINANCIAL_METRICS } from '../../constants/proposalTemplate'

export default function FinancialsEditor({ financials, onChange }) {
  const years = financials?.years || []
  const additionalRows = financials?.additional_rows || []

  const updateYears = (nextYears) => {
    onChange({ ...financials, years: nextYears })
  }

  const updateAdditional = (nextRows) => {
    onChange({ ...financials, additional_rows: nextRows })
  }

  const setYearLabel = (index, label) => {
    const next = years.map((y, i) => (i === index ? { ...y, label } : y))
    updateYears(next)
  }

  const setMetric = (yearIndex, key, value) => {
    const next = years.map((y, i) =>
      i === yearIndex ? { ...y, metrics: { ...y.metrics, [key]: value } } : y
    )
    updateYears(next)
  }

  const addYear = () => {
    const metrics = FINANCIAL_METRICS.reduce((acc, m) => ({ ...acc, [m.key]: '' }), {})
    updateYears([...years, { label: `FY 20__`, metrics }])
  }

  const removeYear = (index) => {
    if (years.length <= 1) return
    updateYears(years.filter((_, i) => i !== index))
  }

  const addCustomRow = () => {
    const values = years.reduce((acc, y) => ({ ...acc, [y.label]: '' }), {})
    updateAdditional([
      ...additionalRows,
      { category: 'Additional', label: 'Custom line item', values },
    ])
  }

  const updateCustomRow = (index, patch) => {
    updateAdditional(additionalRows.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  const setCustomValue = (rowIndex, yearLabel, value) => {
    const row = additionalRows[rowIndex]
    updateCustomRow(rowIndex, {
      values: { ...row.values, [yearLabel]: value },
    })
  }

  const removeCustomRow = (index) => {
    updateAdditional(additionalRows.filter((_, i) => i !== index))
  }

  const categories = [...new Set(FINANCIAL_METRICS.map((m) => m.category))]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-600">
          Add fiscal years and enter figures. You can add more years as needed.
        </p>
        <button
          type="button"
          onClick={addYear}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          + Add Year
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-2 font-semibold">Category / Metric</th>
              {years.map((year, idx) => (
                <th key={idx} className="min-w-[8rem] px-2 py-2">
                  <div className="flex items-center gap-1">
                    <input
                      value={year.label}
                      onChange={(e) => setYearLabel(idx, e.target.value)}
                      placeholder="FY 2024"
                      className="w-full rounded border border-slate-200 px-2 py-1 text-xs"
                    />
                    {years.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeYear(idx)}
                        className="text-red-500 hover:text-red-700"
                        title="Remove year"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => (
              <Fragment key={category}>
                <tr className="bg-green-50/60">
                  <td colSpan={years.length + 1} className="px-3 py-1.5 text-xs font-bold text-green-900">
                    {category}
                  </td>
                </tr>
                {FINANCIAL_METRICS.filter((m) => m.category === category).map((metric) => (
                  <tr key={metric.key} className="border-t border-slate-100">
                    <td className="px-3 py-2 text-slate-700">
                      {metric.label}
                      <span className="ml-1 text-slate-400">({metric.unit})</span>
                    </td>
                    {years.map((year, yearIdx) => (
                      <td key={`${metric.key}-${yearIdx}`} className="px-2 py-1.5">
                        <input
                          type="text"
                          value={year.metrics?.[metric.key] ?? ''}
                          onChange={(e) => setMetric(yearIdx, metric.key, e.target.value)}
                          className="w-full rounded border border-slate-200 px-2 py-1 text-xs"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-slate-800">Additional financial rows</h4>
          <button
            type="button"
            onClick={addCustomRow}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            + Add Row
          </button>
        </div>
        {additionalRows.length === 0 && (
          <p className="text-xs text-slate-500">Optional — e.g. Capex line items</p>
        )}
        {additionalRows.map((row, rowIdx) => (
          <div key={rowIdx} className="rounded-lg border border-slate-200 p-3">
            <div className="mb-2 flex flex-wrap gap-2">
              <input
                value={row.category}
                onChange={(e) => updateCustomRow(rowIdx, { category: e.target.value })}
                placeholder="Category"
                className="rounded border border-slate-200 px-2 py-1 text-xs"
              />
              <input
                value={row.label}
                onChange={(e) => updateCustomRow(rowIdx, { label: e.target.value })}
                placeholder="Line item label"
                className="min-w-[12rem] flex-1 rounded border border-slate-200 px-2 py-1 text-xs"
              />
              <button
                type="button"
                onClick={() => removeCustomRow(rowIdx)}
                className="text-xs text-red-600 hover:underline"
              >
                Remove
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {years.map((year) => (
                <label key={year.label} className="text-xs text-slate-600">
                  {year.label || 'Year'}
                  <input
                    type="text"
                    value={row.values?.[year.label] ?? ''}
                    onChange={(e) => setCustomValue(rowIdx, year.label, e.target.value)}
                    className="mt-0.5 block w-24 rounded border border-slate-200 px-2 py-1"
                  />
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
