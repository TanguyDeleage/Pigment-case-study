import { Flag } from "lucide-react"
import type { Line, Person } from "@/lib/data"
import { MONTH_NAMES, ytdLabel } from "@/lib/data/calendar"
import type { Amounts, PeriodFigures } from "@/lib/finance/aggregate"
import { formatEur, formatPct, rowDecimals } from "@/lib/finance/format"
import { isFavourable, needsAttention, variance, variancePct, type LineType } from "@/lib/finance/variance"
import { PendingMarker } from "@/components/corrections/pending-marker"
import { FavBadge, favClass } from "@/components/shell/status-badge"

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
    <div className="flex-1 px-5 py-4">
      <div className="text-[13px] text-neutral-600">{title}</div>
      <div className="mt-2 flex items-baseline gap-7 whitespace-nowrap">
        <div>
          <div className="text-[12px] text-neutral-500">Actual</div>
          <div className="text-[24px] font-semibold tracking-tight">{formatEur(amounts.actual, { unit: "k", decimals })}</div>
        </div>
        <div>
          <div className="text-[12px] text-neutral-500">Budget</div>
          <div className="text-[24px] text-neutral-700">{formatEur(amounts.budget, { unit: "k", decimals })}</div>
        </div>
        <div>
          <div className="text-[12px] text-neutral-500">Variance</div>
          <div className={`text-[24px] font-semibold ${emphasise && attention ? favClass(fav) : ""}`}>
            {formatEur(v, { unit: "k", decimals, signed: true })}{" "}
            <span className="text-[18px]">{formatPct(variancePct(amounts.actual, amounts.budget))}</span>
          </div>
        </div>
      </div>
      <div className="mt-2.5 flex items-center gap-2">
        <FavBadge favourable={fav} detail={!fav && lineType === "expense" ? "over budget" : undefined} />
        {attention && (
          <span className="flex items-center gap-1 text-[13px] font-semibold">
            <Flag className="size-3.5 fill-current" aria-hidden /> Needs attention
          </span>
        )}
      </div>
    </div>
  )
}

export function SummaryStrip({ line, figures, month, owner }: SummaryStripProps) {
  return (
    <section className="rounded-md border bg-white" aria-label="Variance summary">
      <div className="flex divide-x">
        <Block title={`${MONTH_NAMES[month]} 2026 · AC provisional`} amounts={figures.month} lineType={line.lineType} emphasise />
        <Block title={ytdLabel(month)} amounts={figures.ytd} lineType={line.lineType} emphasise={false} />
      </div>
      <div className="flex items-center gap-3 border-t px-5 py-2.5 text-[13px] text-neutral-700">
        {owner && (
          <span>
            Budget owner <span className="font-medium text-neutral-950">{owner.name}</span>, {owner.role}
          </span>
        )}
        <span className="text-neutral-400">·</span>
        <span>GL {line.accountCode}</span>
        <PendingMarker lineId={line.id} className="ml-auto" />
      </div>
    </section>
  )
}
