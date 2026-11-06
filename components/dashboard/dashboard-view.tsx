"use client"

import { useMemo } from "react"
import { LEDGER, MONTHS, MONTH_NAMES } from "@/lib/data"
import { CURRENT_MONTH, YEAR } from "@/lib/data/calendar"
import { buildVarianceTree, kpis, opexBridge } from "@/lib/finance/aggregate"
import { useFilters } from "@/lib/filters/store"
import { Waterfall, WaterfallLegend } from "@/components/charts/waterfall"
import { Badge } from "@/components/ui/badge"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FilterBar } from "./filter-bar"
import { KpiTile } from "./kpi-tile"
import { VarianceTable } from "./variance-table"

export function DashboardView() {
  const { month, setMonth } = useFilters()

  const data = useMemo(
    () => ({
      kpis: kpis(LEDGER, month),
      tree: buildVarianceTree(LEDGER, month),
    }),
    [month],
  )
  const bridge = useMemo(() => opexBridge(LEDGER, month), [month])

  const periodLabel = `${MONTHS[month]} ${YEAR}`

  return (
    <>
      <FilterBar month={month} onMonthChange={setMonth} />

      <div className="grid grid-cols-3 gap-4">
        <div className="flex flex-col gap-4">
          <KpiTile className="flex-1" title="Revenue" periodLabel={periodLabel} amounts={data.kpis.revenue.month} lineType="revenue" />
          <KpiTile className="flex-1" title="Opex" periodLabel={periodLabel} amounts={data.kpis.opex.month} lineType="expense" />
          <KpiTile className="flex-1" title="Operating result" periodLabel={periodLabel} amounts={data.kpis.result.month} lineType="revenue" />
        </div>

        <Card className="col-span-2 shadow-xs" aria-labelledby="bridge-title">
          <CardHeader>
            <CardTitle id="bridge-title">Opex bridge by cost centre</CardTitle>
            <CardDescription>
              Budget to actual by cost centre · €k · {MONTH_NAMES[month]} is {month === CURRENT_MONTH ? "provisional" : "closed"}
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

      <VarianceTable rows={data.tree} month={month} />
    </>
  )
}
