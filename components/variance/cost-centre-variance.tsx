"use client"

import { useMemo } from "react"
import Link from "next/link"
import { DEPARTMENT_ORDER, DEPARTMENTS, LEDGER, MONTHS, lineId as toLineId } from "@/lib/data"
import { CURRENT_MONTH } from "@/lib/data/calendar"
import { findLine, lineFigures } from "@/lib/finance/aggregate"
import { formatEur } from "@/lib/finance/format"
import { isFavourable, variance } from "@/lib/finance/variance"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface CostCentreVarianceProps {
  accountCode: string
  month: number
}

/** Bars use at most this share of each half (above / below zero), leaving room for the value label. */
const MAX_BAR = 80

/**
 * Same GL account across every cost centre: diverging columns around a zero line,
 * largest |Δ| first. Each column links to that cost centre's drill-down.
 */
export function CostCentreVariance({ accountCode, month }: CostCentreVarianceProps) {
  const rows = useMemo(
    () =>
      DEPARTMENT_ORDER.flatMap((deptId) => {
        const id = toLineId(deptId, accountCode)
        const l = findLine(LEDGER, id)
        if (!l) return []
        const m = lineFigures(LEDGER, id, month).month
        return [{ deptId, lineType: l.lineType, value: variance(m.actual, m.budget) }]
      }).sort((a, b) => Math.abs(b.value) - Math.abs(a.value)),
    [accountCode, month],
  )
  const max = Math.max(...rows.map((r) => Math.abs(r.value)), 1)
  const qs = month === CURRENT_MONTH ? "" : `?month=${month}`

  return (
    <Card className="gap-3 shadow-xs" aria-labelledby="cc-variance-title">
      <CardHeader>
        <CardTitle id="cc-variance-title">{MONTHS[month]} variance by cost centre</CardTitle>
        <CardDescription>Account {accountCode} · €k · Δ = AC − BU · click a column to drill into that cost centre</CardDescription>
      </CardHeader>
      <CardContent>
        <ul
          className="relative flex h-64 items-stretch gap-2"
          aria-label={`${MONTHS[month]} variance on ${accountCode} per cost centre`}
        >
          {/* Zero line across all columns, at the centre of the plot area (above the name row). */}
          <span className="pointer-events-none absolute inset-x-0 top-[calc((100%-2rem)/2)] h-px bg-border" aria-hidden />
          {rows.map((r) => {
            const fav = isFavourable(r.lineType, r.value)
            const height = (Math.abs(r.value) / max) * MAX_BAR
            const label = formatEur(r.value, { unit: "k", decimals: 1, signed: true })
            const name = DEPARTMENTS[r.deptId].name
            return (
              <li key={r.deptId} className="min-w-0 flex-1">
                <Link
                  href={`/variance/${r.deptId}/${accountCode}${qs}`}
                  aria-label={`${name}: ${label}`}
                  className="group flex h-full flex-col rounded-md outline-none hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                  {/* Positive half: bar grows up from the zero line. */}
                  <span className="flex flex-1 flex-col items-center justify-end">
                    {r.value > 0 && (
                      <>
                        <span className="mb-1 text-xs font-medium tabular-nums">{label}</span>
                        <span
                          className={cn("w-3/5 max-w-12 rounded-t-sm", fav ? "bg-fav" : "bg-unfav")}
                          style={{ height: `${height}%` }}
                          aria-hidden
                        />
                      </>
                    )}
                  </span>
                  {/* Negative half: bar grows down from the zero line. */}
                  <span className="flex flex-1 flex-col items-center justify-start">
                    {r.value < 0 && (
                      <>
                        <span
                          className={cn("w-3/5 max-w-12 rounded-b-sm", fav ? "bg-fav" : "bg-unfav")}
                          style={{ height: `${height}%` }}
                          aria-hidden
                        />
                        <span className="mt-1 text-xs font-medium tabular-nums">{label}</span>
                      </>
                    )}
                    {r.value === 0 && <span className="mt-1 text-xs text-muted-foreground tabular-nums">{label}</span>}
                  </span>
                  <span className="flex h-8 shrink-0 items-center justify-center truncate px-1 text-[13px] text-muted-foreground group-hover:text-foreground">
                    {name}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}
