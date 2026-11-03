import type { PeriodFigures } from "@/lib/finance/aggregate"
import { formatEur, formatPct } from "@/lib/finance/format"
import { isFavourable, variance, variancePct, type LineType } from "@/lib/finance/variance"
import { FavBadge } from "@/components/shell/status-badge"

interface KpiTileProps {
  title: string
  periodLabel: string
  ytdLabel: string
  figures: PeriodFigures
  /** Operating result behaves like revenue: higher is better. */
  lineType: LineType
}

const mDecimals = (v: number) => (Math.abs(v) >= 10_000_000 ? 1 : 2)

export function KpiTile({ title, periodLabel, ytdLabel, figures, lineType }: KpiTileProps) {
  const { month, ytd } = figures
  const mv = variance(month.actual, month.budget)
  const yv = variance(ytd.actual, ytd.budget)
  const mFav = isFavourable(lineType, mv)
  const yFav = isFavourable(lineType, yv)

  return (
    <section className="rounded-md border bg-white px-5 pt-4 pb-4" aria-label={`${title} KPI`}>
      <div className="flex items-baseline justify-between">
        <h2 className="text-[15px] font-semibold text-neutral-950">{title}</h2>
        <span className="text-[13px] text-neutral-600">{periodLabel}</span>
      </div>
      <div className="mt-3 flex items-baseline gap-3">
        <span className="text-[34px] leading-none font-semibold tracking-[-0.02em] text-neutral-950">
          {formatEur(month.actual, { unit: "M", decimals: 2 })}
        </span>
        <span className="text-[13px] text-neutral-600">
          BU {formatEur(month.budget, { unit: "M", decimals: mDecimals(month.budget) })}
        </span>
      </div>
      <div className="mt-3 flex items-center gap-3 text-[15px] font-medium text-neutral-950">
        <span>{formatEur(mv, { unit: "k", signed: true })}</span>
        <span>{formatPct(variancePct(month.actual, month.budget))}</span>
        <FavBadge favourable={mFav} detail={!mFav && lineType === "expense" ? "over budget" : undefined} />
      </div>
      <div className="mt-3.5 flex items-center gap-x-2.5 border-t pt-3 text-[13.5px] whitespace-nowrap text-neutral-900">
        <span className="w-14 shrink-0 text-[12.5px] leading-tight whitespace-normal text-neutral-600">{ytdLabel}</span>
        <span className="font-semibold">{formatEur(ytd.actual, { unit: "M", decimals: 1 })}</span>
        <span className="text-neutral-600">BU {formatEur(ytd.budget, { unit: "M", decimals: 1 })}</span>
        <span className="font-medium">{formatEur(yv, { unit: "M", decimals: 1, signed: true })}</span>
        <span className="font-medium">{formatPct(variancePct(ytd.actual, ytd.budget))}</span>
        <FavBadge favourable={yFav} />
      </div>
    </section>
  )
}
