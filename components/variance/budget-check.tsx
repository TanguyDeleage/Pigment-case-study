import { CircleCheck } from "lucide-react"
import { BUDGET_NOTES, DEFAULT_BUDGET_NOTE, MONTH_NAMES } from "@/lib/data"
import type { MonthPoint } from "@/lib/finance/aggregate"
import { formatEur } from "@/lib/finance/format"

interface BudgetCheckProps {
  lineId: string
  series: MonthPoint[]
  month: number
}

/** Step 1 of the investigation: rule out the budget side before blaming actuals. */
export function BudgetCheck({ lineId, series, month }: BudgetCheckProps) {
  const note = BUDGET_NOTES[lineId] ?? DEFAULT_BUDGET_NOTE
  const annual = series.reduce((s, p) => s + p.budget, 0)
  const monthBudget = series[month].budget
  const share = annual ? monthBudget / annual : 0

  return (
    <section className="rounded-md border bg-white px-5 py-4" aria-labelledby="budget-check-title">
      <h2 id="budget-check-title" className="text-[15px] font-semibold">Budget check</h2>
      <dl className="mt-3 grid grid-cols-2 gap-y-2 text-[13px]">
        <dt className="text-neutral-600">{MONTH_NAMES[month]} budget</dt>
        <dd className="text-right font-medium">
          {formatEur(monthBudget, { unit: "k", decimals: 1 })} <span className="text-neutral-500">({(share * 100).toFixed(0)}% of year)</span>
        </dd>
        <dt className="text-neutral-600">FY2026 budget</dt>
        <dd className="text-right font-medium">{formatEur(annual, { unit: "k" })}</dd>
        <dt className="text-neutral-600">Source</dt>
        <dd className="text-right">{note.source}</dd>
      </dl>
      <p className="mt-3 text-[13px] leading-relaxed text-neutral-700">{note.note}</p>
      <p className="mt-3 flex items-start gap-2 rounded-md bg-neutral-100 px-3 py-2 text-[13px] font-medium text-neutral-900">
        <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
        {note.verdict}
      </p>
    </section>
  )
}
