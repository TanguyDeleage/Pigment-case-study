"use client"

import { useMemo } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { DEPARTMENTS, LEDGER, PEOPLE, VENDOR_HISTORY } from "@/lib/data"
import { CURRENT_MONTH } from "@/lib/data/calendar"
import { findLine, lineFigures, monthlySeries, transactionsForLine } from "@/lib/finance/aggregate"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChartLegend, MonthlyBars } from "@/components/charts/monthly-bars"
import { TransactionSheet } from "@/components/transaction/transaction-sheet"
import { BudgetCheck } from "./budget-check"
import { RelatedVarianceHint } from "./related-variance-hint"
import { SummaryStrip } from "./summary-strip"
import { TransactionsTable } from "./transactions-table"
import { VendorBreakdown } from "./vendor-breakdown"

const month = CURRENT_MONTH
type Tab = "overview" | "vendors" | "transactions"
const TABS: Tab[] = ["overview", "vendors", "transactions"]

export function VarianceDetail({ lineId }: { lineId: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const tabParam = params.get("tab") as Tab | null
  const tab: Tab = tabParam && TABS.includes(tabParam) ? tabParam : "overview"
  const txId = params.get("tx")

  const line = findLine(LEDGER, lineId)!
  const figures = useMemo(() => lineFigures(LEDGER, lineId, month), [lineId])
  const series = useMemo(() => monthlySeries(LEDGER, [line]), [line])
  const transactions = useMemo(() => transactionsForLine(LEDGER, lineId), [lineId])
  const selectedTx = transactions.find((t) => t.id === txId) ?? null
  const owner = line.deptId ? PEOPLE[DEPARTMENTS[line.deptId].ownerId] : null

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

  return (
    <>
      <SummaryStrip line={line} figures={figures} month={month} owner={owner} />

      <Tabs value={tab} onValueChange={(v) => setParams({ tab: v === "overview" ? null : v })} className="gap-4">
        <TabsList>
          <TabsTrigger value="overview" className="px-3">Overview</TabsTrigger>
          <TabsTrigger value="vendors" className="px-3">By vendor</TabsTrigger>
          <TabsTrigger value="transactions" className="px-3">
            Transactions
            <span className="rounded-full bg-muted px-1.5 text-[11px] text-muted-foreground tabular-nums">{transactions.length}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] gap-4">
            <Card className="shadow-xs" aria-labelledby="phasing-title">
              <CardHeader>
                <CardTitle id="phasing-title">Monthly actuals vs phased budget</CardTitle>
                <CardDescription>2026 · €k · Δ = AC − BU</CardDescription>
                <CardAction>
                  <ChartLegend />
                </CardAction>
              </CardHeader>
              <CardContent>
              <MonthlyBars
                unit="k"
                panelHeight={330}
                ariaLabel="Monthly actuals versus phased budget for this line"
                panels={[{ label: "", lineType: line.lineType, series }]}
              />
              </CardContent>
            </Card>
            <div className="space-y-4">
              <BudgetCheck lineId={lineId} series={series} month={month} />
              <RelatedVarianceHint lineId={lineId} month={month} />
            </div>
          </div>

          <Card className="gap-0 pb-0 shadow-xs" aria-labelledby="largest-title">
            <CardHeader className="pb-3">
              <CardTitle id="largest-title">Largest October transactions</CardTitle>
              <CardDescription>Click a row to open the transaction and its coding</CardDescription>
              <CardAction>
                <Button variant="outline" size="sm" onClick={() => setParams({ tab: "transactions" })}>
                  See all {transactions.length}
                </Button>
              </CardAction>
            </CardHeader>
            <TransactionsTable transactions={transactions} limit={4} onOpen={openTx} history={VENDOR_HISTORY[lineId]} />
          </Card>
        </TabsContent>

        <TabsContent value="vendors">
          <VendorBreakdown lineId={lineId} history={VENDOR_HISTORY[lineId]} onOpen={openTx} />
        </TabsContent>

        <TabsContent value="transactions">
          <Card className="gap-0 pb-0 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle>October transactions</CardTitle>
              <CardDescription>Provisional until the month closes</CardDescription>
            </CardHeader>
            <TransactionsTable transactions={transactions} onOpen={openTx} history={VENDOR_HISTORY[lineId]} />
          </Card>
        </TabsContent>
      </Tabs>

      <TransactionSheet transaction={selectedTx} onClose={() => setParams({ tx: null })} />
    </>
  )
}
