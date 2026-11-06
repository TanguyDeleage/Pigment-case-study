"use client"

import { useState } from "react"
import { ArrowDown, ArrowUp, ArrowUpDown, ArrowUpRight } from "lucide-react"
import type { Transaction } from "@/lib/data"
import { formatEurExact } from "@/lib/finance/format"
import { requestForTransaction, useCorrections } from "@/lib/corrections/store"
import { cn } from "@/lib/utils"
import { RequestStatusBadge } from "@/components/corrections/request-status-badge"
import { Badge } from "@/components/ui/badge"
import { TruncatedText } from "@/components/ui/truncated-text"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CODING_SOURCE_LABEL, CodingSourceLabel } from "@/components/transaction/coding-source"

interface TransactionsTableProps {
  transactions: Transaction[]
  onOpen: (id: string) => void
  limit?: number
  /** Closed-month vendor totals; vendors missing from it are new to this line. */
  history?: Record<string, number>
}

const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" })

type SortKey = "date" | "vendor" | "codingSource" | "amount"
type SortDir = "asc" | "desc"
interface Sort {
  key: SortKey
  dir: SortDir
}

const DEFAULT_SORT: Sort = { key: "amount", dir: "desc" }

/** Text reads A→Z first; dates and amounts lead with the newest / largest. */
const FIRST_DIR: Record<SortKey, SortDir> = { date: "desc", vendor: "asc", codingSource: "asc", amount: "desc" }

const COMPARE: Record<SortKey, (a: Transaction, b: Transaction) => number> = {
  date: (a, b) => a.postingDate.localeCompare(b.postingDate),
  vendor: (a, b) => a.vendor.localeCompare(b.vendor, "en", { sensitivity: "base" }),
  codingSource: (a, b) => CODING_SOURCE_LABEL[a.codingSource].localeCompare(CODING_SOURCE_LABEL[b.codingSource]),
  amount: (a, b) => a.amount - b.amount,
}

function sortRows(rows: Transaction[], { key, dir }: Sort) {
  const sign = dir === "asc" ? 1 : -1
  // Ties fall back to largest amount first so equal groups stay in a meaningful order.
  return [...rows].sort((a, b) => sign * COMPARE[key](a, b) || b.amount - a.amount)
}

export function TransactionsTable({ transactions, onOpen, limit, history }: TransactionsTableProps) {
  const requests = useCorrections((s) => s.requests)
  const [sort, setSort] = useState<Sort>(DEFAULT_SORT)
  // `limit` keeps the largest transactions; sorting then reorders within that set.
  const top = [...transactions].sort((a, b) => b.amount - a.amount).slice(0, limit)
  const rows = sortRows(top, sort)

  const toggle = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: FIRST_DIR[key] }))
  const header = (key: SortKey, label: string, align?: "right") => (
    <SortableHead label={label} sortKey={key} sort={sort} onSort={toggle} align={align} />
  )

  return (
    <Table className="text-[13.5px]">
      <TableHeader>
        <TableRow className="bg-muted/40 text-xs hover:bg-muted/40 [&>th]:h-9 [&>th]:text-muted-foreground [&>th:first-child]:pl-6 [&>th:last-child]:pr-6">
          <TableHead className="w-24" aria-sort={ariaSort(sort, "date")}>{header("date", "Date")}</TableHead>
          <TableHead aria-sort={ariaSort(sort, "vendor")}>{header("vendor", "Vendor")}</TableHead>
          <TableHead>Description</TableHead>
          <TableHead aria-sort={ariaSort(sort, "codingSource")}>{header("codingSource", "Coding source")}</TableHead>
          <TableHead className="text-right" aria-sort={ariaSort(sort, "amount")}>
            {header("amount", "Amount", "right")}
          </TableHead>
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
              className={cn("group h-12 cursor-pointer outline-none focus-visible:bg-muted/50 [&>td:first-child]:pl-6 [&>td:last-child]:pr-6")}
            >
              <TableCell className="text-muted-foreground tabular-nums">{dateFmt.format(new Date(t.postingDate))}</TableCell>
              <TableCell className="font-medium">
                <span className="flex items-center gap-2">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <TruncatedText className="decoration-foreground/40 underline-offset-4 group-hover:underline group-focus-visible:underline">
                      {t.vendor}
                    </TruncatedText>
                    <ArrowUpRight
                      className="size-3.5 shrink-0 text-blue-600 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 dark:text-blue-400"
                      aria-hidden
                    />
                  </span>
                  {isNew && (
                    <Badge className="bg-unfav-soft text-unfav">
                      New vendor
                    </Badge>
                  )}
                </span>
              </TableCell>
              <TableCell className="text-muted-foreground">
                <TruncatedText className="block max-w-72">{t.description}</TruncatedText>
              </TableCell>
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

const ariaSort = (sort: Sort, key: SortKey) =>
  sort.key === key ? (sort.dir === "asc" ? "ascending" : "descending") : undefined

/** Active column: bold label + solid direction arrow. Others show a faint ↕ on hover only. */
function SortableHead({
  label,
  sortKey,
  sort,
  onSort,
  align,
}: {
  label: string
  sortKey: SortKey
  sort: Sort
  onSort: (key: SortKey) => void
  align?: "right"
}) {
  const active = sort.key === sortKey
  const Icon = !active ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown
  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className={cn(
        "group/sort -mx-1.5 inline-flex h-7 items-center gap-1 rounded-sm px-1.5 outline-none hover:bg-foreground/[0.04] hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50",
        align === "right" && "flex-row-reverse",
        active && "font-semibold text-foreground"
      )}
    >
      {label}
      <Icon
        className={cn(
          "size-3.5 shrink-0",
          active ? "opacity-100" : "opacity-0 group-hover/sort:opacity-60 group-focus-visible/sort:opacity-60"
        )}
        aria-hidden
      />
    </button>
  )
}
