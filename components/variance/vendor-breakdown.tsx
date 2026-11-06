"use client"

import { useMemo } from "react"
import { LEDGER, MONTHS } from "@/lib/data"
import { CURRENT_MONTH } from "@/lib/data/calendar"
import { vendorBreakdown, type VendorRow } from "@/lib/finance/aggregate"
import { formatEur } from "@/lib/finance/format"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TruncatedText } from "@/components/ui/truncated-text"

interface VendorBreakdownProps {
  lineId: string
  history?: Record<string, number>
  onOpen: (txId: string) => void
}

const closedRange = `Jan–${MONTHS[CURRENT_MONTH - 1]}`

export function VendorBreakdown({ lineId, history, onOpen }: VendorBreakdownProps) {
  const rows = useMemo(() => vendorBreakdown(LEDGER, lineId, history ?? {}), [lineId, history])
  const max = Math.max(...rows.map((r) => r.month), 1)
  const total = rows.reduce((s, r) => s + r.month, 0)

  return (
    <Card className="gap-0 pb-0 shadow-xs" aria-labelledby="vendor-title">
      <CardHeader className="pb-4">
        <CardTitle id="vendor-title">October spend by vendor</CardTitle>
        <CardDescription>€k</CardDescription>
        <CardAction className="text-right">
          <div className="text-xs text-muted-foreground">October total</div>
          <div className="text-lg font-semibold tabular-nums">{formatEur(total, { unit: "k", decimals: 1 })}</div>
        </CardAction>
      </CardHeader>
      <CardContent className="px-0">
      <Table className="text-[13.5px]">
        <TableHeader>
          <TableRow className="bg-muted/40 text-xs hover:bg-muted/40 [&>th]:h-9 [&>th]:text-muted-foreground [&>th:first-child]:pl-6 [&>th:last-child]:pr-6">
            <TableHead className="w-[22%]">Vendor</TableHead>
            <TableHead className="w-[26%]">Spent on</TableHead>
            <TableHead className="w-[22%]">October spend (€k)</TableHead>
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
                <TableCell className="max-w-0">
                  <Description transactions={r.transactions} />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="relative h-2.5 flex-1 rounded-full bg-muted">
                      <div className="absolute inset-y-0 left-0 rounded-full bg-ac" style={{ width: `${(r.month / max) * 100}%` }} />
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

/** What the month's spend is for: the largest transaction's description, plus a count of the rest. */
function Description({ transactions }: { transactions: VendorRow["transactions"] }) {
  if (!transactions.length) return <span className="text-muted-foreground">–</span>
  const [main, ...rest] = [...transactions].sort((a, b) => b.amount - a.amount)
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <TruncatedText>{main.description}</TruncatedText>
      {rest.length > 0 && <span className="shrink-0 text-muted-foreground">+{rest.length} more</span>}
    </span>
  )
}
