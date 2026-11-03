"use client"

import { useMemo, useState } from "react"
import { Landmark, MousePointerClick, Receipt, Wallet } from "lucide-react"
import { DEPARTMENTS, LEDGER, MONTHS, MONTH_NAMES, type DepartmentId } from "@/lib/data"
import { CURRENT_MONTH, YEAR, ytdLabel } from "@/lib/data/calendar"
import { buildVarianceTree, kpis, linesOf, monthlySeries, operatingResultBridge, type WaterfallStep } from "@/lib/finance/aggregate"
import { ChartLegend, MonthlyBars } from "@/components/charts/monthly-bars"
import { Waterfall, WaterfallLegend } from "@/components/charts/waterfall"
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { FilterBar } from "./filter-bar"
import { KpiTile } from "./kpi-tile"
import { VarianceTable, type TableFocus } from "./variance-table"

const month = CURRENT_MONTH

export function DashboardView() {
  const [focus, setFocus] = useState<TableFocus | null>(null)

  const data = useMemo(
    () => ({
      kpis: kpis(LEDGER, month),
      revenueSeries: monthlySeries(LEDGER, linesOf(LEDGER, { type: "revenue" })),
      opexSeries: monthlySeries(LEDGER, linesOf(LEDGER, { type: "expense" })),
      bridge: operatingResultBridge(LEDGER, month),
      tree: buildVarianceTree(LEDGER, month),
    }),
    [],
  )

  const periodLabel = `${MONTHS[month]} ${YEAR}`
  const ytd = ytdLabel(month)

  const selectStep = (step: WaterfallStep) => {
    if (focus?.key === step.key) return setFocus(null)
    if (step.lineType === "revenue") return setFocus({ key: step.key, label: "Revenue", revenue: true })
    setFocus({ key: step.key, label: step.sublabel ? `${step.label} (${step.sublabel})` : step.label, deptIds: step.deptIds })
  }

  const selectCostCentre = (id: DepartmentId | null) =>
    setFocus(id ? { key: id, label: DEPARTMENTS[id].name, deptIds: [id] } : null)

  const costCentre = focus?.deptIds?.length === 1 ? focus.deptIds[0] : null

  return (
    <>
      <FilterBar costCentre={costCentre} onCostCentreChange={selectCostCentre} />

      <div className="grid grid-cols-3 gap-4">
        <KpiTile title="Revenue" icon={Landmark} periodLabel={periodLabel} ytdLabel={ytd} figures={data.kpis.revenue} lineType="revenue" />
        <KpiTile title="Opex" icon={Receipt} periodLabel={periodLabel} ytdLabel={ytd} figures={data.kpis.opex} lineType="expense" />
        <KpiTile title="Operating result" icon={Wallet} periodLabel={periodLabel} ytdLabel={ytd} figures={data.kpis.result} lineType="revenue" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="shadow-xs" aria-labelledby="monthly-title">
          <CardHeader>
            <CardTitle id="monthly-title">Revenue and opex by month</CardTitle>
            <CardDescription>Actuals vs budget · {YEAR} · €M · Δ = AC − BU</CardDescription>
            <CardAction>
              <ChartLegend />
            </CardAction>
          </CardHeader>
          <CardContent className="flex-1">
            <MonthlyBars
              unit="M"
              ariaLabel="Monthly revenue and opex, actual versus budget, 2026"
              panels={[
                { label: "Revenue", lineType: "revenue", series: data.revenueSeries },
                { label: "Opex", lineType: "expense", series: data.opexSeries },
              ]}
            />
          </CardContent>
          <CardFooter className="py-3 text-xs text-muted-foreground">
            Selected month: {MONTH_NAMES[month]} (provisional). Nov–Dec: budget only, no actuals yet.
          </CardFooter>
        </Card>

        <Card className="shadow-xs" aria-labelledby="bridge-title">
          <CardHeader>
            <CardTitle id="bridge-title">{MONTH_NAMES[month]} operating result bridge</CardTitle>
            <CardDescription>Budget to actual by department · €k · % = spend vs BU</CardDescription>
            <CardAction>
              <WaterfallLegend />
            </CardAction>
          </CardHeader>
          <CardContent className="flex-1">
            <Waterfall steps={data.bridge} selectedKey={focus?.key ?? null} onSelect={selectStep} />
          </CardContent>
          <CardFooter className="gap-2 py-3 text-xs text-muted-foreground">
            <MousePointerClick className="size-3.5" aria-hidden /> Click a bar to filter the table
            <span className="ml-auto">Grey: no line needs attention</span>
          </CardFooter>
        </Card>
      </div>

      <VarianceTable rows={data.tree} month={month} focus={focus} onClearFocus={() => setFocus(null)} />
    </>
  )
}
