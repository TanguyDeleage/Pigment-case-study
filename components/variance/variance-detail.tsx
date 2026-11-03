"use client"

import { useMemo } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { DEPARTMENTS, LEDGER, PEOPLE, VENDOR_HISTORY } from "@/lib/data"
import { CURRENT_MONTH } from "@/lib/data/calendar"
import { findLine, lineFigures, monthlySeries, transactionsForLine } from "@/lib/finance/aggregate"
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

      <Tabs value={tab} onValueChange={(v) => setParams({ tab: v === "overview" ? null : v })} className="mt-5 gap-4">
        <TabsList variant="line" className="h-10 border-b w-full justify-start rounded-none p-0">
          <TabsTrigger value="overview" className="px-4 text-[14px]">Overview</TabsTrigger>
          <TabsTrigger value="vendors" className="px-4 text-[14px]">By vendor</TabsTrigger>
          <TabsTrigger value="transactions" className="px-4 text-[14px]">
            Transactions <span className="text-neutral-500">({transactions.length})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-5">
          <div className="grid grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] gap-5">
            <section className="rounded-md border bg-white px-5 pt-4 pb-4" aria-labelledby="phasing-title">
              <div className="mb-2 flex items-start justify-between">
                <div>
                  <h2 id="phasing-title" className="text-[16px] font-semibold">Monthly actuals vs phased budget</h2>
                  <p className="text-[13px] text-neutral-600">2026 · €k · Δ = AC − BU</p>
                </div>
                <ChartLegend />
              </div>
              <MonthlyBars
                unit="k"
                panelHeight={200}
                ariaLabel="Monthly actuals versus phased budget for this line"
                panels={[{ label: "", lineType: line.lineType, series }]}
              />
            </section>
            <div className="space-y-5">
              <BudgetCheck lineId={lineId} series={series} month={month} />
              <RelatedVarianceHint lineId={lineId} month={month} />
            </div>
          </div>

          <section className="rounded-md border bg-white px-5 pt-4 pb-3" aria-labelledby="largest-title">
            <div className="mb-2 flex items-baseline justify-between">
              <h2 id="largest-title" className="text-[16px] font-semibold">Largest October transactions</h2>
              <button type="button" onClick={() => setParams({ tab: "transactions" })} className="text-[13px] font-medium underline underline-offset-4">
                See all {transactions.length}
              </button>
            </div>
            <TransactionsTable transactions={transactions} limit={4} onOpen={openTx} history={VENDOR_HISTORY[lineId]} />
          </section>
        </TabsContent>

        <TabsContent value="vendors">
          <VendorBreakdown lineId={lineId} history={VENDOR_HISTORY[lineId]} onOpen={openTx} />
        </TabsContent>

        <TabsContent value="transactions">
          <section className="rounded-md border bg-white px-5 pt-4 pb-3">
            <h2 className="mb-2 text-[16px] font-semibold">October transactions · provisional</h2>
            <TransactionsTable transactions={transactions} onOpen={openTx} history={VENDOR_HISTORY[lineId]} />
          </section>
        </TabsContent>
      </Tabs>

      <TransactionSheet transaction={selectedTx} onClose={() => setParams({ tx: null })} />
    </>
  )
}
