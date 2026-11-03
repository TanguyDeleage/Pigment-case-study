"use client"

import { useMemo } from "react"
import { TriangleAlert } from "lucide-react"
import { LEDGER, MONTHS } from "@/lib/data"
import { CURRENT_MONTH } from "@/lib/data/calendar"
import { vendorBreakdown } from "@/lib/finance/aggregate"
import { formatEur } from "@/lib/finance/format"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
    <Card className="gap-0 pb-0 shadow-xs" aria-labelledby="vendor-title">
      <CardHeader className="pb-4">
        <CardTitle id="vendor-title">October spend by vendor</CardTitle>
        <CardDescription>€k · bar = October actual{history ? `, tick = ${closedRange} monthly average` : ""}</CardDescription>
        <CardAction className="text-right">
          <div className="text-xs text-muted-foreground">October total</div>
          <div className="text-lg font-semibold tabular-nums">{formatEur(total, { unit: "k", decimals: 1 })}</div>
        </CardAction>
      </CardHeader>
      <CardContent className="px-0">

      {outliers.map((o) => (
        <div key={o.vendor} className="mx-4 mb-4 flex items-start gap-2.5 rounded-lg border border-unfav/25 bg-unfav-soft px-3.5 py-2.5 text-[13.5px]">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-unfav" aria-hidden />
          <p>
            <span className="font-semibold">{o.vendor}</span> accounts for {formatEur(o.month, { unit: "k", decimals: 1 })} (
            {Math.round(o.share * 100)}% of October)
            {o.priorTotal === 0 ? " and has never been billed to this line before." : `, ${o.outlierReason}.`}
          </p>
        </div>
      ))}

      <Table className="text-[13.5px]">
        <TableHeader>
          <TableRow className="bg-muted/40 text-xs hover:bg-muted/40 [&>th]:h-9 [&>th]:text-muted-foreground [&>th:first-child]:pl-6 [&>th:last-child]:pr-6">
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
                  "h-12 outline-none [&>td:first-child]:pl-6 [&>td:last-child]:pr-6",
                  first && "cursor-pointer focus-visible:bg-muted/50",
                  highlight && "bg-unfav-soft/50 shadow-[inset_3px_0_0_var(--unfav)] hover:bg-unfav-soft",
                  !first && "text-muted-foreground",
                )}
              >
                <TableCell className="font-medium">
                  <span className="flex items-center gap-2">
                    {r.vendor}
                    {highlight && (
                      <Badge className="bg-unfav-soft text-unfav ring-1 ring-unfav/20">
                        Outlier · {r.outlierReason}
                      </Badge>
                    )}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="relative h-2.5 flex-1 rounded-full bg-muted">
                      <div className="absolute inset-y-0 left-0 rounded-full bg-ac" style={{ width: `${(r.month / max) * 100}%` }} />
                      {history && r.priorMonthlyAvg > 0 && (
                        <div
                          className="absolute -inset-y-1.5 w-0.5 rounded-full bg-foreground"
                          style={{ left: `${(r.priorMonthlyAvg / max) * 100}%` }}
                          aria-hidden
                        />
                      )}
                    </div>
                    <span className="w-14 text-right tabular-nums">{r.month ? (r.month / 1000).toFixed(1) : "–"}</span>
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
      </CardContent>
    </Card>
  )
}
