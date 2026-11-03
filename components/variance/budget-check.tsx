import { CircleCheck } from "lucide-react"
import { BUDGET_NOTES, DEFAULT_BUDGET_NOTE, MONTH_NAMES } from "@/lib/data"
import type { MonthPoint } from "@/lib/finance/aggregate"
import { formatEur } from "@/lib/finance/format"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

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
    <Card className="shadow-xs" aria-labelledby="budget-check-title">
      <CardHeader>
        <CardTitle id="budget-check-title">Budget check</CardTitle>
      </CardHeader>
      <CardContent>
      <dl className="grid grid-cols-2 gap-y-2 text-[13px]">
        <dt className="text-muted-foreground">{MONTH_NAMES[month]} budget</dt>
        <dd className="text-right font-medium">
          {formatEur(monthBudget, { unit: "k", decimals: 1 })} <span className="text-muted-foreground">({(share * 100).toFixed(0)}% of year)</span>
        </dd>
        <dt className="text-muted-foreground">FY2026 budget</dt>
        <dd className="text-right font-medium">{formatEur(annual, { unit: "k" })}</dd>
        <dt className="text-muted-foreground">Source</dt>
        <dd className="text-right">{note.source}</dd>
      </dl>
      <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">{note.note}</p>
      <p className="mt-3 flex items-start gap-2 rounded-lg bg-emerald-50 px-3 py-2.5 text-[13px] font-medium text-emerald-900">
        <CircleCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden />
        {note.verdict}
      </p>
      </CardContent>
    </Card>
  )
}
