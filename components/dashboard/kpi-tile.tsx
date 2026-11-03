import type { LucideIcon } from "lucide-react"
import type { PeriodFigures } from "@/lib/finance/aggregate"
import { formatEur, formatPct } from "@/lib/finance/format"
import { isFavourable, variance, variancePct, type LineType } from "@/lib/finance/variance"
import { cn } from "@/lib/utils"
import { FavBadge, favClass } from "@/components/shell/status-badge"
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

interface KpiTileProps {
  title: string
  icon: LucideIcon
  periodLabel: string
  ytdLabel: string
  figures: PeriodFigures
  /** Operating result behaves like revenue: higher is better. */
  lineType: LineType
}

const mDecimals = (v: number) => (Math.abs(v) >= 10_000_000 ? 1 : 2)

export function KpiTile({ title, icon: Icon, periodLabel, ytdLabel, figures, lineType }: KpiTileProps) {
  const { month, ytd } = figures
  const mv = variance(month.actual, month.budget)
  const yv = variance(ytd.actual, ytd.budget)
  const mFav = isFavourable(lineType, mv)
  const yFav = isFavourable(lineType, yv)

  return (
    <Card className="gap-3 shadow-xs" aria-label={`${title} KPI`}>
      <CardHeader>
        <CardDescription className="flex items-center gap-2 font-medium text-foreground">
          <span className="flex size-6 items-center justify-center rounded-md bg-muted">
            <Icon className="size-3.5 text-muted-foreground" aria-hidden />
          </span>
          {title}
        </CardDescription>
        <CardAction>
          <FavBadge favourable={mFav} detail={!mFav && lineType === "expense" ? "over budget" : undefined} />
        </CardAction>
      </CardHeader>
      <CardContent>
        <CardTitle className="text-3xl font-semibold tracking-tight tabular-nums">
          {formatEur(month.actual, { unit: "M", decimals: 2 })}
        </CardTitle>
        <div className="mt-1.5 flex items-center gap-1.5 text-sm text-muted-foreground">
          <span className={cn("font-medium tabular-nums", favClass(mFav))}>
            {formatEur(mv, { unit: "k", signed: true })} ({formatPct(variancePct(month.actual, month.budget))})
          </span>
          <span>vs BU {formatEur(month.budget, { unit: "M", decimals: mDecimals(month.budget) })}</span>
          <span className="ml-auto text-xs">{periodLabel}</span>
        </div>
      </CardContent>
      <CardFooter className="mt-1 gap-2 py-3 text-xs whitespace-nowrap text-muted-foreground">
        <span className="font-medium text-foreground">{ytdLabel}</span>
        <span className="font-medium text-foreground tabular-nums">{formatEur(ytd.actual, { unit: "M", decimals: 1 })}</span>
        <span className="tabular-nums">BU {formatEur(ytd.budget, { unit: "M", decimals: 1 })}</span>
        <span className={cn("ml-auto font-medium tabular-nums", favClass(yFav))}>
          {formatEur(yv, { unit: "M", decimals: 1, signed: true })} · {formatPct(variancePct(ytd.actual, ytd.budget))}
        </span>
      </CardFooter>
    </Card>
  )
}
