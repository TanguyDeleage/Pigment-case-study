"use client"

import { useMemo, useState } from "react"
import { DEPARTMENTS, LEDGER, MONTHS, MONTH_NAMES, type DepartmentId } from "@/lib/data"
import { CURRENT_MONTH, YEAR } from "@/lib/data/calendar"
import { buildVarianceTree, kpis, linesOf, monthlySeries, opexBridge } from "@/lib/finance/aggregate"
import { RevenueTrend, RevenueTrendLegend } from "@/components/charts/revenue-trend"
import { Waterfall, WaterfallLegend } from "@/components/charts/waterfall"
import { Badge } from "@/components/ui/badge"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FilterBar } from "./filter-bar"
import { KpiTile } from "./kpi-tile"
import { VarianceTable, type TableFocus } from "./variance-table"

export function DashboardView() {
  const [month, setMonth] = useState(CURRENT_MONTH)
  const [focus, setFocus] = useState<TableFocus | null>(null)
  const costCentre = focus?.deptIds?.length === 1 ? focus.deptIds[0] : null

  const data = useMemo(
    () => ({
      kpis: kpis(LEDGER, month),
      revenueSeries: monthlySeries(LEDGER, linesOf(LEDGER, { type: "revenue" })),
      tree: buildVarianceTree(LEDGER, month),
    }),
    [month],
  )
  const bridge = useMemo(() => opexBridge(LEDGER, month, costCentre), [month, costCentre])

  const periodLabel = `${MONTHS[month]} ${YEAR}`

  const selectCostCentre = (id: DepartmentId | null) =>
    setFocus(id ? { key: id, label: DEPARTMENTS[id].name, deptIds: [id] } : null)

  return (
    <>
      <FilterBar month={month} onMonthChange={setMonth} costCentre={costCentre} onCostCentreChange={selectCostCentre} />

      <div className="grid grid-cols-3 gap-4">
        <KpiTile title="Revenue" periodLabel={periodLabel} amounts={data.kpis.revenue.month} lineType="revenue" />
        <KpiTile title="Opex" periodLabel={periodLabel} amounts={data.kpis.opex.month} lineType="expense" />
        <KpiTile title="Operating result" periodLabel={periodLabel} amounts={data.kpis.result.month} lineType="revenue" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="shadow-xs" aria-labelledby="monthly-title">
          <CardHeader>
            <CardTitle id="monthly-title">Revenue by month</CardTitle>
            <CardDescription>Actual vs budget · {YEAR} · €M</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-4">
            <RevenueTrendLegend />
            <RevenueTrend series={data.revenueSeries} year={YEAR} />
          </CardContent>
        </Card>

        <Card className="shadow-xs" aria-labelledby="bridge-title">
          <CardHeader>
            <CardTitle id="bridge-title">
              {costCentre ? `${DEPARTMENTS[costCentre].name} opex bridge by account` : "Opex bridge by cost centre"}
            </CardTitle>
            <CardDescription>
              Budget to actual by {costCentre ? "account" : "cost centre"} · €k · {MONTH_NAMES[month]} is {month === CURRENT_MONTH ? "provisional" : "closed"}
            </CardDescription>
            <CardAction>
              <Badge variant="secondary">{periodLabel}</Badge>
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-4">
            <WaterfallLegend />
            <Waterfall steps={bridge} />
          </CardContent>
        </Card>
      </div>

      <VarianceTable rows={data.tree} month={month} focus={focus} onClearFocus={() => setFocus(null)} />
    </>
  )
}
