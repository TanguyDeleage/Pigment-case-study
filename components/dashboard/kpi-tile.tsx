import { ArrowDown, ArrowUp } from "lucide-react"
import type { PeriodFigures } from "@/lib/finance/aggregate"
import { formatEur, formatPct } from "@/lib/finance/format"
import { isFavourable, variance, variancePct, type LineType } from "@/lib/finance/variance"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface KpiTileProps {
  title: string
  periodLabel: string
  figures: PeriodFigures
  /** Operating result behaves like revenue: higher is better. */
  lineType: LineType
}

const mDecimals = (v: number) => (Math.abs(v) >= 10_000_000 ? 1 : 2)

export function KpiTile({ title, periodLabel, figures, lineType }: KpiTileProps) {
  const { month } = figures
  const mv = variance(month.actual, month.budget)
  const mFav = isFavourable(lineType, mv)
  const pct = variancePct(month.actual, month.budget)
  const Arrow = mv < 0 ? ArrowDown : ArrowUp

  return (
    <Card className="gap-4 shadow-xs" aria-label={`${title} KPI`}>
      <CardHeader>
        <CardDescription className="font-medium">{title}</CardDescription>
        <CardAction>
          <Badge variant="secondary" className="font-medium text-muted-foreground">
            {periodLabel}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <CardTitle className="text-4xl font-bold tracking-tight tabular-nums">
          {formatEur(month.actual, { unit: "M", decimals: 2 })}
        </CardTitle>
        <div className="flex items-center gap-2 text-sm whitespace-nowrap text-muted-foreground">
          <Badge className={cn("gap-1 font-semibold tabular-nums", mFav ? "bg-fav-soft text-fav" : "bg-unfav-soft text-unfav")}>
            <Arrow aria-hidden />
            {formatPct(pct === null ? null : Math.abs(pct), { signed: false })}
          </Badge>
          <span>
            <span className="font-semibold text-foreground tabular-nums">{formatEur(mv, { unit: "k", signed: true })}</span>{" "}
            vs budget of <span className="tabular-nums">{formatEur(month.budget, { unit: "M", decimals: mDecimals(month.budget) })}</span>
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
