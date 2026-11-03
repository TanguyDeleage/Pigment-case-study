import Link from "next/link"
import { ArrowRight, GitCompareArrows } from "lucide-react"
import { DEPARTMENTS, LEDGER, lineLabel } from "@/lib/data"
import { relatedVariances } from "@/lib/finance/aggregate"
import { formatEur, formatPct, rowDecimals } from "@/lib/finance/format"
import { isFavourable, variance, variancePct } from "@/lib/finance/variance"
import { FavBadge } from "@/components/shell/status-badge"

/** Mirror-image variance on the same GL account in another cost centre: a miscoding hint. */
export function RelatedVarianceHint({ lineId, month }: { lineId: string; month: number }) {
  const related = relatedVariances(LEDGER, lineId, month)
  if (!related.length) return null

  return (
    <section className="rounded-md border border-dashed border-neutral-500 bg-white px-5 py-4" aria-labelledby="related-title">
      <h2 id="related-title" className="flex items-center gap-2 text-[15px] font-semibold">
        <GitCompareArrows className="size-4" aria-hidden /> Related variance
      </h2>
      {related.map(({ line, figures: { month: m } }) => {
        const v = variance(m.actual, m.budget)
        const dept = line.deptId ? DEPARTMENTS[line.deptId].name : "Revenue"
        return (
          <div key={line.id} className="mt-3">
            <div className="text-[13px] font-medium">
              {dept} · {lineLabel(line.accountCode)}
            </div>
            <div className="mt-1 flex items-center gap-2 text-[14px]">
              <span className="font-semibold">{formatEur(v, { unit: "k", decimals: rowDecimals(m.actual, m.budget), signed: true })}</span>
              <span>{formatPct(variancePct(m.actual, m.budget))}</span>
              <FavBadge favourable={isFavourable(line.lineType, v)} />
            </div>
            <p className="mt-2 text-[13px] leading-relaxed text-neutral-700">
              Same account, opposite direction, similar size. Spend may have landed on the wrong cost centre.
            </p>
            <Link
              href={`/variance/${line.deptId ?? "revenue"}/${line.accountCode}`}
              className="mt-2 inline-flex items-center gap-1 text-[13px] font-medium underline underline-offset-4"
            >
              Open {dept} line <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </div>
        )
      })}
    </section>
  )
}
