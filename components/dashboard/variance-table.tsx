"use client"

import { useMemo, useState } from "react"
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
import { ChevronDown, ChevronRight, ChevronsDownUp, ChevronsUpDown, MessageSquarePlus, Search, TriangleAlert, X } from "lucide-react"
import { CURRENT_USER, PEOPLE, type DepartmentId } from "@/lib/data"
import { CURRENT_MONTH, MONTH_NAMES, ytdLabel } from "@/lib/data/calendar"
import type { VarianceRow } from "@/lib/finance/aggregate"
import { formatK, formatPct, rowDecimals } from "@/lib/finance/format"
import { ATTENTION_THRESHOLD, isFavourable, variance, variancePct } from "@/lib/finance/variance"
import { cn } from "@/lib/utils"
import { commentaryKey, useCommentary } from "@/lib/commentary/store"
import { PendingMarker } from "@/components/corrections/pending-marker"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"

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

/** Tint strength grows with |Var €| as a multiple of the materiality threshold. */
const VARIANCE_BG = {
  fav: ["bg-fav/10", "bg-fav/20", "bg-fav/30"],
  unfav: ["bg-unfav/10", "bg-unfav/20", "bg-unfav/30"],
} as const

function varianceBg(r: VarianceRow): string {
  if (r.kind !== "line" || !r.attention) return ""
  const v = variance(r.figures.month.actual, r.figures.month.budget)
  const multiple = Math.abs(v) / ATTENTION_THRESHOLD.abs
  const level = multiple > 4 ? 2 : multiple > 2 ? 1 : 0
  return VARIANCE_BG[isFavourable(r.lineType, v) ? "fav" : "unfav"][level]
}

function NumberCell({ value, className }: { value: string; className?: string }) {
  return <span className={cn("block text-right", className)}>{value}</span>
}

export function VarianceTable({ rows, month, focus, onClearFocus }: VarianceTableProps) {
  const router = useRouter()
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
      (r) => inFocus(r) && (!q || r.label.toLowerCase().includes(q)),
      inFocus,
    ).filter((g) => !focus || (focus.revenue ? g.id === "revenue" : g.id === "expenses"))
  }, [rows, q, focus])

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
            return (
              <NumberCell
                className={cn(key === "month" && r.kind === "line" && r.attention && "font-semibold")}
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
            return <NumberCell className={cn(key === "month" && r.kind === "line" && r.attention && "font-semibold")} value={formatPct(pctOf(f))} />
          },
        },
        ...(key === "month"
          ? [
              {
                id: "month-comment",
                header: "Commentary",
                cell: ({ row: { original: r } }) => (r.lineId ? <CommentaryCell lineId={r.lineId} month={month} /> : null),
              } satisfies ColumnDef<VarianceRow>,
            ]
          : []),
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
  const allExpanded = table.getIsAllRowsExpanded()
  const groupStart = new Set(["month", "ytd", "month-actual", "ytd-actual", "month-comment"])

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
                    h.column.id === "label" && "w-[24%]",
                    h.column.id === "month-comment" && "w-[18%] text-left",
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
                    className={cn(
                      "py-2 tabular-nums",
                      groupStart.has(cell.column.id) && "border-l",
                      cell.column.id === "label" && "pl-6",
                      (cell.column.id === "month-var" || cell.column.id === "month-pct") && varianceBg(r),
                    )}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            )
          })}
          {data.length === 0 && (
            <TableRow>
              <TableCell colSpan={11} className="py-10 text-center text-muted-foreground">
                No lines match.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      </CardContent>

      <CardFooter className="justify-between py-3 text-xs text-muted-foreground">
        <span>Showing all {allLeaves.length} accounts.</span>
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
          {r.attention && <TriangleAlert className="size-3.5 text-unfav" aria-label="Needs attention" />}
        </span>
      )}
      <span className={cn("truncate", r.kind === "line" && "pl-1")}>{r.label}</span>
      {r.lineId && <PendingMarker lineId={r.lineId} />}
    </div>
  )
}

function CommentaryCell({ lineId, month }: { lineId: string; month: number }) {
  const key = commentaryKey(lineId, month)
  const commentary = useCommentary((s) => s.byKey[key])
  const save = useCommentary((s) => s.save)
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState("")

  const onOpenChange = (next: boolean) => {
    if (next) setDraft(commentary?.body ?? "")
    setOpen(next)
  }
  const submit = () => {
    const body = draft.trim()
    save(key, body ? { body, authorId: CURRENT_USER, at: new Date().toISOString() } : null)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className="-mx-2 block w-[calc(100%+1rem)] rounded-md px-2 py-1 text-left text-xs hover:bg-muted"
        >
          {commentary ? (
            <span className="line-clamp-2 whitespace-normal text-foreground">{commentary.body}</span>
          ) : (
            <span className="flex items-center gap-1.5 text-muted-foreground opacity-0 group-hover:opacity-100 focus-visible:opacity-100">
              <MessageSquarePlus className="size-3.5" aria-hidden /> Add comment
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80" onClick={(e) => e.stopPropagation()}>
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
        >
          <Textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit()
            }}
            placeholder="Explain this variance"
            aria-label="Variance commentary"
            className="min-h-20 text-sm"
          />
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-xs text-muted-foreground">
              {commentary && `${PEOPLE[commentary.authorId].name} · ${new Date(commentary.at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`}
            </span>
            <Button type="submit" size="sm">
              Save
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  )
}
