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
import { ArrowRight, ChevronDown, ChevronRight, ChevronsDownUp, ChevronsUpDown, Flag, Search, X } from "lucide-react"
import type { DepartmentId } from "@/lib/data"
import { CURRENT_MONTH, MONTH_NAMES, ytdLabel } from "@/lib/data/calendar"
import type { VarianceRow } from "@/lib/finance/aggregate"
import { formatK, formatPct, rowDecimals } from "@/lib/finance/format"
import { ATTENTION_THRESHOLD, isFavourable, variance, variancePct } from "@/lib/finance/variance"
import { cn } from "@/lib/utils"
import { PendingMarker } from "@/components/corrections/pending-marker"
import { FavBadge, favClass } from "@/components/shell/status-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
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
      block("month", `${MONTH_NAMES[month]} · AC ${month === CURRENT_MONTH ? "provisional" : "closed"}`),
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
    <Card className="gap-0 py-0 shadow-xs" aria-labelledby="variance-title">
      <CardHeader className="border-b py-4">
        <CardTitle id="variance-title" className="flex items-center gap-2">
          Variance detail
          {focus && (
            <Badge variant="secondary" className="h-6 gap-1 pr-0.5 pl-2.5 font-medium">
              {focus.label}
              <Button variant="ghost" size="icon-xs" className="size-5 rounded-full" onClick={onClearFocus} aria-label="Clear filter">
                <X />
              </Button>
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          {MONTH_NAMES[month]} 2026 and year to date · €k
        </CardDescription>
        <CardAction className="flex items-center gap-2 self-center">
          <div className="flex h-9 items-center gap-2 rounded-lg border px-3 shadow-xs">
            <Switch id="attention-only" checked={attentionOnly} onCheckedChange={setAttentionOnly} />
            <Label htmlFor="attention-only" className="text-sm font-normal">
              Needs attention only
            </Label>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search line or GL account"
              aria-label="Search line or GL account"
              className="h-9 w-64 pl-9 shadow-xs"
            />
          </div>
          <Button variant="outline" className="h-9 shadow-xs" onClick={() => table.toggleAllRowsExpanded(!allExpanded)}>
            {allExpanded ? <ChevronsDownUp /> : <ChevronsUpDown />}
            {allExpanded ? "Collapse all" : "Expand all"}
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent className="px-0">
      <Table className="text-[13.5px]">
        <TableHeader>
          {table.getHeaderGroups().map((hg, gi) => (
            <TableRow key={hg.id} className="bg-muted/40 hover:bg-muted/40">
              {hg.headers.map((h) => (
                <TableHead
                  key={h.id}
                  colSpan={h.colSpan}
                  className={cn(
                    "h-9 text-xs font-medium text-muted-foreground",
                    gi === 0 && "text-center",
                    h.column.id === "label" && "pl-6",
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
                  r.kind === "group" && "bg-muted/30 font-semibold hover:bg-muted/50",
                  r.kind === "department" && "font-medium",
                  clickable && "cursor-pointer",
                )}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={cn("py-2 tabular-nums", groupStart.has(cell.column.id) && "border-l", cell.column.id === "label" && "pl-6")}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            )
          })}
          {data.length === 0 && (
            <TableRow>
              <TableCell colSpan={10} className="py-10 text-center text-muted-foreground">
                No lines match.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      </CardContent>

      <CardFooter className="justify-between py-3 text-xs text-muted-foreground">
        <span>
          {attentionOnly
            ? `${hiddenDepts} departments and ${hiddenLines} accounts hidden: within threshold. Turn off 'Needs attention only' to see all.`
            : `Showing all ${allLeaves.length} accounts.`}
        </span>
        <span>
          Needs attention = |Var| &gt; {ATTENTION_THRESHOLD.pct * 100}% and &gt; €{ATTENTION_THRESHOLD.abs / 1000}k
        </span>
      </CardFooter>
    </Card>
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
          className="flex size-5 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
        >
          {row.getIsExpanded() ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
        </button>
      ) : (
        <span className="flex w-6 justify-end">
          {r.attention && <Flag className="size-3.5 fill-unfav text-unfav" aria-label="Needs attention" />}
        </span>
      )}
      <span className={cn("truncate", r.kind === "line" && "pl-1")}>{r.label}</span>
    </div>
  )
}

function StatusCell({ row: r }: { row: VarianceRow }) {
  const m = r.figures.month
  const fav = isFavourable(r.lineType, variance(m.actual, m.budget))
  if (r.kind !== "line" || !r.attention) {
    return (
      <div className="flex items-center gap-2">
        <span className={cn("flex items-center gap-1.5 text-xs font-normal", "text-muted-foreground")}>
          <span className={cn("size-1.5 rounded-full", fav ? "bg-fav/60" : "bg-unfav/60")} aria-hidden />
          {fav ? "Fav" : "Unfav"}
        </span>
        {r.lineId && <PendingMarker lineId={r.lineId} />}
      </div>
    )
  }
  return (
    <div className="flex items-center gap-2">
      <FavBadge favourable={fav} />
      <span className="text-xs font-medium whitespace-nowrap">Needs attention</span>
      {r.lineId && <PendingMarker lineId={r.lineId} />}
      <Link
        href={detailHref(r)}
        onClick={(e) => e.stopPropagation()}
        className="ml-auto flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium whitespace-nowrap opacity-0 group-hover:bg-background group-hover:opacity-100 hover:underline focus-visible:opacity-100"
      >
        View <ArrowRight className="size-3.5" aria-hidden />
      </Link>
    </div>
  )
}
