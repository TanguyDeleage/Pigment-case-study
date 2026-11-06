"use client"

import { useEffect, useMemo } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { DEPARTMENT_ORDER, LEDGER, VENDOR_HISTORY, lineId as toLineId, type DepartmentId } from "@/lib/data"
import { CURRENT_MONTH, MONTHS, YEAR } from "@/lib/data/calendar"
import { useFilters } from "@/lib/filters/store"
import { figuresFor, findLine, monthlySeries, transactionsForLine } from "@/lib/finance/aggregate"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ChartLegend, MonthlyBars } from "@/components/charts/monthly-bars"
import { FilterBar } from "@/components/dashboard/filter-bar"
import { KpiTile } from "@/components/dashboard/kpi-tile"
import { TransactionSheet } from "@/components/transaction/transaction-sheet"
import { TransactionsTable } from "./transactions-table"

/** Selected month from `?month=`; falls back to the provisional month. */
function parseMonth(raw: string | null): number {
  const n = raw === null ? NaN : Number(raw)
  return Number.isInteger(n) && n >= 0 && n <= CURRENT_MONTH ? n : CURRENT_MONTH
}

/**
 * Sums per-line vendor histories. Only when every line has one — otherwise vendors on a line
 * without history would all be flagged as new.
 */
function mergedHistory(lineIds: string[]): Record<string, number> | undefined {
  if (!lineIds.every((id) => VENDOR_HISTORY[id])) return undefined
  const out: Record<string, number> = {}
  for (const id of lineIds) for (const [v, n] of Object.entries(VENDOR_HISTORY[id])) out[v] = (out[v] ?? 0) + n
  return out
}

interface VarianceDetailProps {
  accountCode: string
  /** A single cost centre, `null` for revenue lines (no cost centre), or "all" for the account across cost centres. */
  scope: DepartmentId | "all" | null
}

export function VarianceDetail({ accountCode, scope }: VarianceDetailProps) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const txId = params.get("tx")
  const month = parseMonth(params.get("month"))
  const provisional = month === CURRENT_MONTH

  const all = scope === "all"
  const lines = useMemo(
    () =>
      all
        ? LEDGER.lines.filter((l) => l.accountCode === accountCode && l.deptId)
        : [findLine(LEDGER, toLineId(scope, accountCode))!],
    [all, scope, accountCode],
  )
  const lineIds = useMemo(() => lines.map((l) => l.id), [lines])
  const lineType = lines[0].lineType
  const hasCostCentre = scope !== null
  // Cost centres that carry this GL account — the only ones the filter can switch to.
  const costCentres = useMemo(
    () => DEPARTMENT_ORDER.filter((d) => findLine(LEDGER, toLineId(d, accountCode))),
    [accountCode],
  )
  const figures = useMemo(() => figuresFor(LEDGER, lines, month), [lines, month])
  const series = useMemo(() => monthlySeries(LEDGER, lines), [lines])
  const transactions = useMemo(
    () => lineIds.flatMap((id) => transactionsForLine(LEDGER, id)).sort((a, b) => b.amount - a.amount),
    [lineIds],
  )
  const history = useMemo(() => mergedHistory(lineIds), [lineIds])

  // The URL is the source of truth here; mirror the period into the shared filters so the
  // dashboard opens on the same month.
  const syncMonth = useFilters((s) => s.setMonth)
  useEffect(() => {
    syncMonth(month)
  }, [month, syncMonth])
  const selectedTx = transactions.find((t) => t.id === txId) ?? null

  const setParams = (next: Record<string, string | null>) => {
    const sp = new URLSearchParams(params.toString())
    for (const [k, v] of Object.entries(next)) {
      if (v === null) sp.delete(k)
      else sp.set(k, v)
    }
    const qs = sp.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }
  const openTx = (id: string) => setParams({ tx: id })
  const setMonth = (m: number) => setParams({ month: m === CURRENT_MONTH ? null : String(m), tx: null })
  const setCostCentre = (deptId: DepartmentId | null) => {
    const next = deptId ?? "all"
    if (next === scope) return
    const qs = provisional ? "" : `?month=${month}`
    router.push(`/variance/${next}/${accountCode}${qs}`, { scroll: false })
  }

  return (
    <>
      <FilterBar
        month={month}
        onMonthChange={setMonth}
        costCentre={all ? null : scope}
        onCostCentreChange={hasCostCentre ? setCostCentre : undefined}
        costCentres={costCentres}
      />

      <div className="space-y-8">
        <section aria-labelledby="overview-heading" className="space-y-3">
          <h2 id="overview-heading" className="sr-only">
            Overview
          </h2>
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-4">
            <div className="space-y-4">
              <KpiTile
                title={`Month · AC ${provisional ? "provisional" : "closed"}`}
                periodLabel={`${MONTHS[month]} ${YEAR}`}
                amounts={figures.month}
                lineType={lineType}
                unit="k"
              />
              <KpiTile
                title="Year to date"
                periodLabel={`Jan–${MONTHS[month]} ${YEAR}`}
                amounts={figures.ytd}
                lineType={lineType}
                unit="k"
              />
            </div>
            <Card className="min-h-72 shadow-xs" aria-labelledby="phasing-title">
              <CardHeader>
                <CardTitle id="phasing-title">Monthly actuals vs phased budget</CardTitle>
                <CardDescription>2026 · €k · Δ = AC − BU</CardDescription>
                <CardAction>
                  <ChartLegend />
                </CardAction>
              </CardHeader>
              {/* Absolutely positioned so the chart fills the row height set by the KPI column instead of driving it. */}
              <CardContent className="relative min-h-0 flex-1">
                <div className="absolute inset-0 px-(--card-spacing)">
                  <MonthlyBars
                    unit="k"
                    fit
                    selectedMonth={month}
                    ariaLabel={`Monthly actuals versus phased budget for ${all ? "this account across cost centres" : "this line"}`}
                    panels={[{ label: "", lineType, series }]}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section aria-labelledby="transactions-heading" className="space-y-3">
          <h2 id="transactions-heading" className="sr-only">
            Transactions
          </h2>
          {provisional ? (
            <Card className="gap-0 pb-0 shadow-xs" aria-labelledby="transactions-title">
              <CardHeader className="pb-3">
                <CardTitle id="transactions-title">
                  Transactions{" "}
                  <span className="font-normal text-muted-foreground tabular-nums">· {transactions.length}</span>
                </CardTitle>
                <CardAction>
                  <Badge variant="secondary" className="font-medium text-muted-foreground">
                    {MONTHS[month]} {YEAR}
                  </Badge>
                </CardAction>
              </CardHeader>
              <TransactionsTable transactions={transactions} onOpen={openTx} history={history} />
            </Card>
          ) : (
            <ClosedMonthNote month={month} />
          )}
        </section>
      </div>

      <TransactionSheet transaction={selectedTx} onClose={() => setParams({ tx: null })} />
    </>
  )
}

/** Transaction-level detail is only loaded for the provisional month; closed months come in as booked totals. */
function ClosedMonthNote({ month }: { month: number }) {
  return (
    <Card className="justify-center shadow-xs">
      <CardContent className="py-6 text-center text-sm text-muted-foreground">
        {MONTHS[month]} {YEAR} is closed and loaded as booked totals. Transaction detail is available for{" "}
        {MONTHS[CURRENT_MONTH]} {YEAR} (provisional).
      </CardContent>
    </Card>
  )
}
