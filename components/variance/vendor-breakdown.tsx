"use client"

import { useMemo } from "react"
import { TriangleAlert } from "lucide-react"
import { LEDGER, MONTHS } from "@/lib/data"
import { CURRENT_MONTH } from "@/lib/data/calendar"
import { vendorBreakdown } from "@/lib/finance/aggregate"
import { formatEur } from "@/lib/finance/format"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface VendorBreakdownProps {
  lineId: string
  history?: Record<string, number>
  onOpen: (txId: string) => void
}

const closedRange = `Jan–${MONTHS[CURRENT_MONTH - 1]}`

export function VendorBreakdown({ lineId, history, onOpen }: VendorBreakdownProps) {
  const rows = useMemo(() => vendorBreakdown(LEDGER, lineId, history ?? {}), [lineId, history])
  const max = Math.max(...rows.map((r) => Math.max(r.month, r.priorMonthlyAvg)), 1)
  const total = rows.reduce((s, r) => s + r.month, 0)
  const outliers = history ? rows.filter((r) => r.outlier) : []

  return (
    <section className="rounded-md border bg-white px-5 pt-4 pb-3" aria-labelledby="vendor-title">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h2 id="vendor-title" className="text-[16px] font-semibold">October spend by vendor</h2>
          <p className="text-[13px] text-neutral-600">
            €k · bar = October actual{history ? `, tick = ${closedRange} monthly average` : ""}
          </p>
        </div>
        <div className="text-[13px] text-neutral-700">October total {formatEur(total, { unit: "k", decimals: 1 })}</div>
      </div>

      {outliers.map((o) => (
        <div key={o.vendor} className="mb-3 flex items-start gap-2.5 rounded-md border border-unfav/40 bg-unfav-soft px-3.5 py-2.5 text-[13.5px]">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-unfav" aria-hidden />
          <p>
            <span className="font-semibold">{o.vendor}</span> accounts for {formatEur(o.month, { unit: "k", decimals: 1 })} (
            {Math.round(o.share * 100)}% of October)
            {o.priorTotal === 0 ? " and has never been billed to this line before." : `, ${o.outlierReason}.`}
          </p>
        </div>
      ))}

      <Table className="text-[14px]">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[26%]">Vendor</TableHead>
            <TableHead className="w-[34%]">October</TableHead>
            {history && <TableHead className="text-right">{closedRange} avg / month</TableHead>}
            <TableHead className="text-right">Share of Oct</TableHead>
            <TableHead className="text-right">Transactions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => {
            const highlight = history && r.outlier
            const first = r.transactions[0]
            return (
              <TableRow
                key={r.vendor}
                tabIndex={first ? 0 : undefined}
                onClick={first ? () => onOpen(first.id) : undefined}
                onKeyDown={(e) => first && e.key === "Enter" && onOpen(first.id)}
                className={cn(
                  "h-12 outline-none",
                  first && "cursor-pointer hover:bg-neutral-100 focus-visible:bg-neutral-100",
                  highlight && "bg-unfav-soft/60 shadow-[inset_3px_0_0_var(--unfav)] hover:bg-unfav-soft",
                  !first && "text-neutral-500",
                )}
              >
                <TableCell className="font-medium">
                  <span className="flex items-center gap-2">
                    {r.vendor}
                    {highlight && (
                      <Badge variant="outline" className="border-unfav bg-white text-unfav">
                        Outlier · {r.outlierReason}
                      </Badge>
                    )}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="relative h-4 flex-1">
                      <div className="absolute inset-y-0 left-0 bg-ac" style={{ width: `${(r.month / max) * 100}%` }} />
                      {history && r.priorMonthlyAvg > 0 && (
                        <div
                          className="absolute -inset-y-1 w-0.5 bg-neutral-900"
                          style={{ left: `${(r.priorMonthlyAvg / max) * 100}%` }}
                          aria-hidden
                        />
                      )}
                    </div>
                    <span className="w-14 text-right">{r.month ? (r.month / 1000).toFixed(1) : "–"}</span>
                  </div>
                </TableCell>
                {history && <TableCell className="text-right">{r.priorTotal ? (r.priorMonthlyAvg / 1000).toFixed(1) : "–"}</TableCell>}
                <TableCell className="text-right">{r.month ? `${Math.round(r.share * 100)}%` : "–"}</TableCell>
                <TableCell className="text-right">{r.transactions.length || "–"}</TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </section>
  )
}
