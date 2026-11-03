"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  useReactTable,
  type ColumnDef,
  type ExpandedState,
  type Row,
} from "@tanstack/react-table"
import { ArrowRight, ChevronDown, ChevronRight, Flag, Search, X } from "lucide-react"
import type { DepartmentId } from "@/lib/data"
import { MONTH_NAMES, ytdLabel } from "@/lib/data/calendar"
import type { VarianceRow } from "@/lib/finance/aggregate"
import { formatK, formatPct, rowDecimals } from "@/lib/finance/format"
import { ATTENTION_THRESHOLD, isFavourable, variance, variancePct } from "@/lib/finance/variance"
import { cn } from "@/lib/utils"
import { PendingMarker } from "@/components/corrections/pending-marker"
import { FavBadge, favClass } from "@/components/shell/status-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export interface TableFocus {
  key: string
  label: string
  deptIds?: DepartmentId[]
  revenue?: boolean
}

interface VarianceTableProps {
  rows: VarianceRow[]
  month: number
  focus: TableFocus | null
  onClearFocus: () => void
}

export function detailHref(row: VarianceRow): string {
  return `/variance/${row.deptId ?? "revenue"}/${row.accountCode}`
}

/** Prunes the tree; parents survive when any child does. Groups (Revenue, Expenses) always stay. */
function filterTree(rows: VarianceRow[], keepLeaf: (r: VarianceRow) => boolean, keepDept: (r: VarianceRow) => boolean): VarianceRow[] {
  return rows.flatMap((r) => {
    if (r.kind === "line") return keepLeaf(r) ? [r] : []
    if (r.kind === "department" && !keepDept(r)) return []
    const subRows = filterTree(r.subRows ?? [], keepLeaf, keepDept)
    if (r.kind === "department" && subRows.length === 0) return []
    return [{ ...r, subRows }]
  })
}

const pctOf = (a: { actual: number; budget: number }) => variancePct(a.actual, a.budget)

function NumberCell({ value, className }: { value: string; className?: string }) {
  return <span className={cn("block text-right", className)}>{value}</span>
}

export function VarianceTable({ rows, month, focus, onClearFocus }: VarianceTableProps) {
  const router = useRouter()
  const [attentionOnly, setAttentionOnly] = useState(true)
  const [query, setQuery] = useState("")
  const [expanded, setExpanded] = useState<ExpandedState>(() =>
    Object.fromEntries([["expenses", true], ...(rows[1]?.subRows ?? []).map((d) => [d.id, true])]),
  )

  const q = query.trim().toLowerCase()
  const data = useMemo(() => {
    const inFocus = (r: VarianceRow) => {
      if (!focus) return true
      if (focus.revenue) return r.lineType === "revenue"
      return r.lineType === "expense" && !!r.deptId && !!focus.deptIds?.includes(r.deptId)
    }
    return filterTree(
      rows,
      (r) => inFocus(r) && (!attentionOnly || r.attention) && (!q || r.label.toLowerCase().includes(q)),
      (d) => inFocus(d) && (!attentionOnly || d.attentionCount > 0),
    ).filter((g) => !focus || (focus.revenue ? g.id === "revenue" : g.id === "expenses"))
  }, [rows, attentionOnly, q, focus])

  const columns = useMemo<ColumnDef<VarianceRow>[]>(() => {
    const block = (key: "month" | "ytd", title: string): ColumnDef<VarianceRow> => ({
      id: key,
      header: title,
      columns: [
        {
          id: `${key}-actual`,
          header: () => <NumberCell value="Actual" />,
          cell: ({ row: { original: r } }) => {
            const f = r.figures[key]
            return <NumberCell value={formatK(f.actual, { decimals: r.kind === "line" ? rowDecimals(f.actual, f.budget) : 0 })} />
          },
        },
        {
          id: `${key}-budget`,
          header: () => <NumberCell value="Budget" />,
          cell: ({ row: { original: r } }) => {
            const f = r.figures[key]
            return <NumberCell value={formatK(f.budget, { decimals: r.kind === "line" ? rowDecimals(f.actual, f.budget) : 0 })} />
          },
        },
        {
          id: `${key}-var`,
          header: () => <NumberCell value="Var €" />,
          cell: ({ row: { original: r } }) => {
            const f = r.figures[key]
            const v = variance(f.actual, f.budget)
            const colour = key === "month" && r.kind === "line" && r.attention ? favClass(isFavourable(r.lineType, v)) : ""
            return (
              <NumberCell
                className={cn(colour, colour && "font-semibold")}
                value={formatK(v, { signed: true, decimals: r.kind === "line" ? rowDecimals(f.actual, f.budget) : 0 })}
              />
            )
          },
        },
        {
          id: `${key}-pct`,
          header: () => <NumberCell value="Var %" />,
          cell: ({ row: { original: r } }) => {
            const f = r.figures[key]
            const colour = key === "month" && r.kind === "line" && r.attention ? favClass(isFavourable(r.lineType, variance(f.actual, f.budget))) : ""
            return <NumberCell className={cn(colour, colour && "font-semibold")} value={formatPct(pctOf(f))} />
          },
        },
      ],
    })

    return [
      {
        id: "line",
        header: "",
        columns: [
          {
            id: "label",
            header: () => <span className="pl-3.5">Line · €k</span>,
            cell: ({ row }) => <LineCell row={row} />,
          },
        ],
      },
      block("month", `${MONTH_NAMES[month]} · AC provisional`),
      block("ytd", ytdLabel(month)),
      {
        id: "status-group",
        header: "",
        columns: [{ id: "status", header: "Status", cell: ({ row }) => <StatusCell row={row.original} /> }],
      },
    ]
  }, [month])

  const table = useReactTable({
    data,
    columns,
    state: { expanded: q ? true : expanded },
    onExpandedChange: setExpanded,
    getSubRows: (r) => r.subRows,
    getRowId: (r) => r.id,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
  })

  const allLeaves = rows.flatMap(function leaves(r): VarianceRow[] {
    return r.kind === "line" ? [r] : (r.subRows ?? []).flatMap(leaves)
  })
  const hiddenDepts = (rows[1]?.subRows ?? []).filter((d) => d.attentionCount === 0).length
  const hiddenLines = allLeaves.filter((l) => !l.attention).length
  const allExpanded = table.getIsAllRowsExpanded()
  const groupStart = new Set(["month", "ytd", "status-group", "month-actual", "ytd-actual", "status"])

  return (
    <section className="rounded-md border bg-white px-5 pt-4 pb-4" aria-labelledby="variance-title">
      <div className="mb-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 id="variance-title" className="text-[17px] font-semibold text-neutral-950">
            {MONTH_NAMES[month]} 2026 · Variance detail
          </h2>
          {focus && (
            <span className="flex h-7 items-center gap-1 rounded-full border border-neutral-800 bg-neutral-50 pr-1 pl-3 text-[13px] font-medium">
              Filtered: {focus.label}
              <Button variant="ghost" size="icon-xs" className="rounded-full" onClick={onClearFocus} aria-label="Clear filter">
                <X />
              </Button>
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <Switch id="attention-only" checked={attentionOnly} onCheckedChange={setAttentionOnly} className="data-[state=checked]:bg-neutral-800" />
            <Label htmlFor="attention-only" className="text-[14px] font-normal text-neutral-900">
              Needs attention only
            </Label>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-neutral-500" aria-hidden />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search line or GL account"
              aria-label="Search line or GL account"
              className="h-9 w-72 pl-9 text-[14px]"
            />
          </div>
          <Button variant="outline" className="h-9 px-3.5 text-[14px]" onClick={() => table.toggleAllRowsExpanded(!allExpanded)}>
            {allExpanded ? "Collapse all" : "Expand all"}
          </Button>
        </div>
      </div>

      <Table className="text-[14px]">
        <TableHeader>
          {table.getHeaderGroups().map((hg, gi) => (
            <TableRow key={hg.id} className="hover:bg-transparent">
              {hg.headers.map((h) => (
                <TableHead
                  key={h.id}
                  colSpan={h.colSpan}
                  className={cn(
                    "h-9 font-medium text-neutral-800",
                    gi === 0 ? "text-center text-[13px]" : "text-[13px]",
                    gi === 0 && h.isPlaceholder && "border-b-0",
                    groupStart.has(h.column.id) && h.id !== "line" && "border-l",
                    h.column.id === "label" && "w-[30%]",
                    h.column.id === "status" && "w-[22%]",
                  )}
                >
                  {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => {
            const r = row.original
            const clickable = r.kind === "line"
            return (
              <TableRow
                key={row.id}
                onClick={clickable ? () => router.push(detailHref(r)) : undefined}
                className={cn(
                  "group h-11",
                  r.kind === "group" && "bg-neutral-100/80 font-semibold hover:bg-neutral-100",
                  r.kind === "department" && "font-semibold",
                  clickable && "cursor-pointer hover:bg-neutral-100",
                )}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className={cn("py-2", groupStart.has(cell.column.id) && "border-l")}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            )
          })}
          {data.length === 0 && (
            <TableRow>
              <TableCell colSpan={10} className="py-8 text-center text-neutral-500">
                No lines match.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <div className="mt-3 flex justify-between text-[13px] text-neutral-700">
        <span>
          {attentionOnly
            ? `${hiddenDepts} departments and ${hiddenLines} accounts hidden: within threshold. Turn off 'Needs attention only' to see all.`
            : `Showing all ${allLeaves.length} accounts.`}
        </span>
        <span>
          Needs attention = |Var| &gt; {ATTENTION_THRESHOLD.pct * 100}% and &gt; €{ATTENTION_THRESHOLD.abs / 1000}k
        </span>
      </div>
    </section>
  )
}

function LineCell({ row }: { row: Row<VarianceRow> }) {
  const r = row.original
  const indent = row.depth * 18
  const canExpand = row.getCanExpand()
  return (
    <div className="flex items-center gap-1.5" style={{ paddingLeft: indent }}>
      {r.kind !== "line" ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            row.toggleExpanded()
          }}
          disabled={!canExpand}
          aria-label={row.getIsExpanded() ? `Collapse ${r.label}` : `Expand ${r.label}`}
          aria-expanded={row.getIsExpanded()}
          className="flex size-4 items-center justify-center rounded-sm text-neutral-700 disabled:opacity-30"
        >
          {row.getIsExpanded() ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
        </button>
      ) : (
        <span className="flex w-6 justify-end">
          {r.attention && <Flag className="size-3.5 fill-neutral-900 text-neutral-900" aria-label="Needs attention" />}
        </span>
      )}
      <span className={cn("truncate", r.kind === "line" && "pl-1 text-neutral-900")}>{r.label}</span>
    </div>
  )
}

function StatusCell({ row: r }: { row: VarianceRow }) {
  const m = r.figures.month
  const fav = isFavourable(r.lineType, variance(m.actual, m.budget))
  if (r.kind !== "line" || !r.attention) {
    return (
      <div className="flex items-center gap-2">
        <span className="font-normal text-neutral-600">{fav ? "Fav" : "Unfav"}</span>
        {r.lineId && <PendingMarker lineId={r.lineId} />}
      </div>
    )
  }
  return (
    <div className="flex items-center gap-2">
      <FavBadge favourable={fav} />
      <span className="font-semibold whitespace-nowrap text-neutral-900">Needs attention</span>
      {r.lineId && <PendingMarker lineId={r.lineId} />}
      <Link
        href={detailHref(r)}
        onClick={(e) => e.stopPropagation()}
        className="ml-auto flex items-center gap-1 font-medium whitespace-nowrap text-neutral-950 underline underline-offset-4 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
      >
        View transactions <ArrowRight className="size-3.5" aria-hidden />
      </Link>
    </div>
  )
}
