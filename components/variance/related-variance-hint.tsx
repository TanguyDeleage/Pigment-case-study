import Link from "next/link"
import { ArrowRight, GitCompareArrows } from "lucide-react"
import { DEPARTMENTS, LEDGER, lineLabel } from "@/lib/data"
import { relatedVariances } from "@/lib/finance/aggregate"
import { formatEur, formatPct, rowDecimals } from "@/lib/finance/format"
import { isFavourable, variance, variancePct } from "@/lib/finance/variance"
import { FavBadge } from "@/components/shell/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

/** Mirror-image variance on the same GL account in another cost centre: a miscoding hint. */
export function RelatedVarianceHint({ lineId, month }: { lineId: string; month: number }) {
  const related = relatedVariances(LEDGER, lineId, month)
  if (!related.length) return null

  return (
    <Card className="bg-linear-to-b from-brand-soft/60 to-card shadow-xs ring-brand/25" aria-labelledby="related-title">
      <CardHeader>
        <CardTitle id="related-title" className="flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-md bg-brand text-white">
            <GitCompareArrows className="size-3.5" aria-hidden />
          </span>
          Related variance
        </CardTitle>
        <CardDescription>Possible miscoding detected</CardDescription>
      </CardHeader>
      <CardContent>
      {related.map(({ line, figures: { month: m } }) => {
        const v = variance(m.actual, m.budget)
        const dept = line.deptId ? DEPARTMENTS[line.deptId].name : "Revenue"
        return (
          <div key={line.id} className="rounded-lg border bg-card p-3">
            <div className="text-[13px] font-medium">
              {dept} · {lineLabel(line.accountCode)}
            </div>
            <div className="mt-1 flex items-center gap-2 text-sm tabular-nums">
              <span className="font-semibold">{formatEur(v, { unit: "k", decimals: rowDecimals(m.actual, m.budget), signed: true })}</span>
              <span>{formatPct(variancePct(m.actual, m.budget))}</span>
              <FavBadge favourable={isFavourable(line.lineType, v)} />
            </div>
            <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
              Same account, opposite direction, similar size. Spend may have landed on the wrong cost centre.
            </p>
            <Button asChild variant="outline" size="sm" className="mt-3">
              <Link href={`/variance/${line.deptId ?? "revenue"}/${line.accountCode}`}>
                Open {dept} line <ArrowRight aria-hidden />
              </Link>
            </Button>
          </div>
        )
      })}
      </CardContent>
    </Card>
  )
}
