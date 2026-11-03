import { Flag } from "lucide-react"
import type { Line, Person } from "@/lib/data"
import { MONTH_NAMES, ytdLabel } from "@/lib/data/calendar"
import type { Amounts, PeriodFigures } from "@/lib/finance/aggregate"
import { formatEur, formatPct, rowDecimals } from "@/lib/finance/format"
import { isFavourable, needsAttention, variance, variancePct, type LineType } from "@/lib/finance/variance"
import { PendingMarker } from "@/components/corrections/pending-marker"
import { FavBadge, favClass } from "@/components/shell/status-badge"
import { Card } from "@/components/ui/card"

interface SummaryStripProps {
  line: Line
  figures: PeriodFigures
  month: number
  owner: Person | null
}

function Block({ title, amounts, lineType, emphasise }: { title: string; amounts: Amounts; lineType: LineType; emphasise: boolean }) {
  const v = variance(amounts.actual, amounts.budget)
  const fav = isFavourable(lineType, v)
  const attention = needsAttention(amounts.actual, amounts.budget)
  const decimals = rowDecimals(amounts.actual, amounts.budget)
  return (
    <div className="flex-1 px-6 py-5">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">{title}</div>
        <div className="flex items-center gap-2">
          {attention && (
            <span className="flex items-center gap-1 text-xs font-medium text-unfav">
              <Flag className="size-3 fill-current" aria-hidden /> Needs attention
            </span>
          )}
          <FavBadge favourable={fav} detail={!fav && lineType === "expense" ? "over budget" : undefined} />
        </div>
      </div>
      <div className="mt-3 flex items-baseline gap-8 whitespace-nowrap">
        <div>
          <div className="text-xs text-muted-foreground">Actual</div>
          <div className="text-2xl font-semibold tracking-tight tabular-nums">{formatEur(amounts.actual, { unit: "k", decimals })}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Budget</div>
          <div className="text-2xl tracking-tight text-muted-foreground tabular-nums">{formatEur(amounts.budget, { unit: "k", decimals })}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Variance</div>
          <div className={`text-2xl font-semibold tracking-tight tabular-nums ${emphasise && attention ? favClass(fav) : ""}`}>
            {formatEur(v, { unit: "k", decimals, signed: true })}{" "}
            <span className="text-base font-medium">{formatPct(variancePct(amounts.actual, amounts.budget))}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export function SummaryStrip({ line, figures, month, owner }: SummaryStripProps) {
  return (
    <Card className="gap-0 py-0 shadow-xs" aria-label="Variance summary">
      <div className="flex divide-x">
        <Block title={`${MONTH_NAMES[month]} 2026 · AC provisional`} amounts={figures.month} lineType={line.lineType} emphasise />
        <Block title={ytdLabel(month)} amounts={figures.ytd} lineType={line.lineType} emphasise={false} />
      </div>
      <div className="flex items-center gap-3 border-t bg-muted/40 px-6 py-3 text-xs text-muted-foreground">
        {owner && (
          <span>
            Budget owner <span className="font-medium text-foreground">{owner.name}</span>, {owner.role}
          </span>
        )}
        <span aria-hidden>·</span>
        <span className="font-mono">GL {line.accountCode}</span>
        <PendingMarker lineId={line.id} className="ml-auto" />
      </div>
    </Card>
  )
}
