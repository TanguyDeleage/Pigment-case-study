"use client"

import type { Transaction } from "@/lib/data"
import { formatEurExact } from "@/lib/finance/format"
import { requestForTransaction, useCorrections } from "@/lib/corrections/store"
import { cn } from "@/lib/utils"
import { RequestStatusBadge } from "@/components/corrections/request-status-badge"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CodingSourceLabel } from "@/components/transaction/coding-source"

interface TransactionsTableProps {
  transactions: Transaction[]
  onOpen: (id: string) => void
  limit?: number
  /** Closed-month vendor totals; vendors missing from it are new to this line. */
  history?: Record<string, number>
}

const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" })

export function TransactionsTable({ transactions, onOpen, limit, history }: TransactionsTableProps) {
  const requests = useCorrections((s) => s.requests)
  const rows = [...transactions].sort((a, b) => b.amount - a.amount).slice(0, limit)

  return (
    <Table className="text-[13.5px]">
      <TableHeader>
        <TableRow className="bg-muted/40 text-xs hover:bg-muted/40 [&>th]:h-9 [&>th]:text-muted-foreground [&>th:first-child]:pl-6 [&>th:last-child]:pr-6">
          <TableHead className="w-20">Date</TableHead>
          <TableHead>Vendor</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Coding source</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead className="w-44">Correction</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((t) => {
          const request = requestForTransaction(requests, t.id)
          const isNew = history !== undefined && !(t.vendor in history)
          return (
            <TableRow
              key={t.id}
              tabIndex={0}
              onClick={() => onOpen(t.id)}
              onKeyDown={(e) => e.key === "Enter" && onOpen(t.id)}
              className={cn("h-12 cursor-pointer outline-none focus-visible:bg-muted/50 [&>td:first-child]:pl-6 [&>td:last-child]:pr-6")}
            >
              <TableCell className="text-muted-foreground tabular-nums">{dateFmt.format(new Date(t.postingDate))}</TableCell>
              <TableCell className="font-medium">
                <span className="flex items-center gap-2">
                  {t.vendor}
                  {isNew && (
                    <Badge className="bg-unfav-soft text-unfav">
                      New vendor
                    </Badge>
                  )}
                </span>
              </TableCell>
              <TableCell className="max-w-72 truncate text-muted-foreground">{t.description}</TableCell>
              <TableCell>
                <CodingSourceLabel source={t.codingSource} />
              </TableCell>
              <TableCell className="text-right font-medium tabular-nums">{formatEurExact(t.amount)}</TableCell>
              <TableCell>{request && <RequestStatusBadge status={request.status} />}</TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
