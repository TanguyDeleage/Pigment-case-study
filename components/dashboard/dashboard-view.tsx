"use client"

import { useMemo, useState } from "react"
import { MousePointerClick } from "lucide-react"
import { DEPARTMENTS, LEDGER, MONTHS, MONTH_NAMES, type DepartmentId } from "@/lib/data"
import { CURRENT_MONTH, YEAR, ytdLabel } from "@/lib/data/calendar"
import { buildVarianceTree, kpis, linesOf, monthlySeries, operatingResultBridge, type WaterfallStep } from "@/lib/finance/aggregate"
import { ChartLegend, MonthlyBars } from "@/components/charts/monthly-bars"
import { Waterfall, WaterfallLegend } from "@/components/charts/waterfall"
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

  const periodLabel = `${MONTHS[month]} ${YEAR} · AC provisional`
  const ytd = ytdLabel(month).replace("YTD ", "YTD ")

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

      <div className="grid grid-cols-3 gap-5">
        <KpiTile title="Revenue" periodLabel={periodLabel} ytdLabel={ytd} figures={data.kpis.revenue} lineType="revenue" />
        <KpiTile title="Opex" periodLabel={periodLabel} ytdLabel={ytd} figures={data.kpis.opex} lineType="expense" />
        <KpiTile title="Operating result" periodLabel={periodLabel} ytdLabel={ytd} figures={data.kpis.result} lineType="revenue" />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-5">
        <section className="flex flex-col rounded-md border bg-white px-5 pt-4 pb-4" aria-labelledby="monthly-title">
          <div className="mb-2 flex items-start justify-between gap-4">
            <div>
              <h2 id="monthly-title" className="text-[16px] font-semibold text-neutral-950">
                Revenue and opex by month, actuals vs budget
              </h2>
              <p className="text-[13px] text-neutral-600">{YEAR} · €M · Δ = AC − BU</p>
            </div>
            <ChartLegend />
          </div>
          <div className="flex-1">
            <MonthlyBars
              unit="M"
              ariaLabel="Monthly revenue and opex, actual versus budget, 2026"
              panels={[
                { label: "Revenue", lineType: "revenue", series: data.revenueSeries },
                { label: "Opex", lineType: "expense", series: data.opexSeries },
              ]}
            />
          </div>
          <p className="mt-2 text-[13px] text-neutral-700">
            Selected month: {MONTH_NAMES[month]} (provisional). Nov–Dec: budget only, no actuals yet.
          </p>
        </section>

        <section className="flex flex-col rounded-md border bg-white px-5 pt-4 pb-4" aria-labelledby="bridge-title">
          <div className="mb-2 flex items-start justify-between gap-4">
            <div>
              <h2 id="bridge-title" className="text-[16px] font-semibold text-neutral-950">
                {MONTH_NAMES[month]} operating result: budget to actual, by department
              </h2>
              <p className="text-[13px] text-neutral-600">€k · axis broken on total bars · % = department spend vs BU</p>
            </div>
            <WaterfallLegend />
          </div>
          <div className="flex-1">
            <Waterfall steps={data.bridge} selectedKey={focus?.key ?? null} onSelect={selectStep} />
          </div>
          <p className="mt-3 flex items-center gap-2 text-[13px] text-neutral-700">
            <MousePointerClick className="size-4" aria-hidden /> Click a bar to filter the table
            <span className="ml-auto text-neutral-500">Grey: no line needs attention</span>
          </p>
        </section>
      </div>

      <div className="mt-5">
        <VarianceTable rows={data.tree} month={month} focus={focus} onClearFocus={() => setFocus(null)} />
      </div>
    </>
  )
}
