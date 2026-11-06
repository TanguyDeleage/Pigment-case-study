"use client"

import { useMemo, useRef, useState } from "react"
import Link from "next/link"
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type ExpandedState,
  type Row,
} from "@tanstack/react-table"
import {
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  Copy,
  MessageSquare,
  Search,
  TriangleAlert,
} from "lucide-react"
import { CURRENT_USER, PEOPLE } from "@/lib/data"
import { CURRENT_MONTH, MONTH_NAMES, ytdLabel } from "@/lib/data/calendar"
import type { VarianceRow } from "@/lib/finance/aggregate"
import { formatK, formatPct, rowDecimals } from "@/lib/finance/format"
import { ATTENTION_THRESHOLD, isFavourable, variance, variancePct } from "@/lib/finance/variance"
import { cn } from "@/lib/utils"
import { cellCommentKey, commentaryKey, useCommentary, type Commentary } from "@/lib/commentary/store"
import { PendingMarker } from "@/components/corrections/pending-marker"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuShortcut, ContextMenuTrigger } from "@/components/ui/context-menu"
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { TruncatedText } from "@/components/ui/truncated-text"


interface VarianceTableProps {
  rows: VarianceRow[]
  month: number
}

export function detailHref(row: VarianceRow, month: number): string {
  const path = `/variance/${row.deptId ?? "revenue"}/${row.accountCode}`
  return month === CURRENT_MONTH ? path : `${path}?month=${month}`
}

/** Prunes the tree; parents survive when any child does. Groups (Revenue, Expenses) always stay. */
function filterTree(rows: VarianceRow[], keepLeaf: (r: VarianceRow) => boolean): VarianceRow[] {
  return rows.flatMap((r) => {
    if (r.kind === "line") return keepLeaf(r) ? [r] : []
    const subRows = filterTree(r.subRows ?? [], keepLeaf)
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

/** Label + commentary take fixed shares; the 8 figure columns split the remaining 58%. */
const COL_WIDTH: Record<string, string> = { label: "w-[24%]", "month-comment": "w-[18%]" }

const hasAttentionLine = (r: VarianceRow): boolean =>
  r.kind === "line" ? !!r.attention : (r.subRows ?? []).some(hasAttentionLine)

/**
 * Flattens the tree for rendering. An expanded row shows all its children; a collapsed one
 * still shows the path down to any line needing attention, so warnings are never hidden.
 */
function visibleRows(rows: Row<VarianceRow>[]): Row<VarianceRow>[] {
  return rows.flatMap((row) => {
    if (!row.subRows.length) return [row]
    const children = row.getIsExpanded() ? row.subRows : row.subRows.filter((c) => hasAttentionLine(c.original))
    return [row, ...visibleRows(children)]
  })
}

/**
 * The label column sticks to the left when the table scrolls horizontally. Sticky cells need an
 * opaque fill, so they paint the card colour and layer the row's tint on top as a gradient
 * (mirroring TableRow's hover / expanded tints and the group-row tint).
 */
const STICKY = "sticky left-0 z-10 bg-card bg-linear-to-r shadow-[inset_-1px_0_0_var(--color-border)]"
const STICKY_ROW_TINT =
  "group-hover:from-muted/50 group-hover:to-muted/50 group-has-[[aria-expanded=true]]:from-muted/50 group-has-[[aria-expanded=true]]:to-muted/50"

function NumberCell({ value, className }: { value: string; className?: string }) {
  return <span className={cn("flex justify-end whitespace-nowrap", className)}>{value}</span>
}

const FIGURE_COLUMNS = new Set(["actual", "budget", "var", "pct"].flatMap((c) => [`month-${c}`, `ytd-${c}`]))

export function VarianceTable({ rows, month }: VarianceTableProps) {
  const [query, setQuery] = useState("")
  // Fully collapsed by default; lines needing attention stay visible regardless (see visibleRows).
  const [expanded, setExpanded] = useState<ExpandedState>({})

  const q = query.trim().toLowerCase()
  const data = useMemo(() => (q ? filterTree(rows, (r) => r.label.toLowerCase().includes(q)) : rows), [rows, q])

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
            return (
              <FigureCell
                rowId={r.id}
                month={month}
                columnId={`${key}-actual`}
                value={formatK(f.actual, { decimals: r.kind === "line" ? rowDecimals(f.actual, f.budget) : 0 })}
              />
            )
          },
        },
        {
          id: `${key}-budget`,
          header: () => <NumberCell value="Budget" />,
          cell: ({ row: { original: r } }) => {
            const f = r.figures[key]
            return (
              <FigureCell
                rowId={r.id}
                month={month}
                columnId={`${key}-budget`}
                value={formatK(f.budget, { decimals: r.kind === "line" ? rowDecimals(f.actual, f.budget) : 0 })}
              />
            )
          },
        },
        {
          id: `${key}-var`,
          header: () => <NumberCell value="Var €" />,
          cell: ({ row: { original: r } }) => {
            const f = r.figures[key]
            const v = variance(f.actual, f.budget)
            return (
              <FigureCell
                rowId={r.id}
                month={month}
                columnId={`${key}-var`}
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
            return (
              <FigureCell
                rowId={r.id}
                month={month}
                columnId={`${key}-pct`}
                className={cn(key === "month" && r.kind === "line" && r.attention && "font-semibold")}
                value={formatPct(pctOf(f))}
              />
            )
          },
        },
        ...(key === "month"
          ? [
              {
                id: "month-comment",
                header: "Commentary",
                cell: ({ row: { original: r } }) =>
                  r.lineId ? <CommentaryCell lineId={r.lineId} month={month} /> : null,
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
            cell: ({ row }) => <LineCell row={row} month={month} />,
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
  })

  const allExpanded = table.getIsAllRowsExpanded()
  const groupStart = new Set(["month", "ytd", "month-actual", "ytd-actual", "month-comment"])

  return (
    <Card className="gap-0 py-0 shadow-xs" aria-labelledby="variance-title">
      <CardHeader className="border-b py-4">
        <CardTitle id="variance-title" className="flex items-center gap-2">
          Variance detail
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
      {/* Fixed layout + explicit widths: expanding/collapsing rows must not resize columns. */}
      <Table className="min-w-[1100px] table-fixed text-[13.5px]">
        <colgroup>
          {table.getVisibleLeafColumns().map((c) => (
            <col key={c.id} className={COL_WIDTH[c.id] ?? "w-[7.25%]"} />
          ))}
        </colgroup>
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
                    (h.column.id === "label" || h.column.id === "line") && cn(STICKY, "from-muted/40 to-muted/40"),
                    gi === 0 && h.isPlaceholder && "border-b-0",
                    groupStart.has(h.column.id) && h.id !== "line" && "border-l",
                    h.column.id === "month-comment" && "text-left",
                  )}
                >
                  {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {visibleRows(table.getCoreRowModel().rows).map((row) => {
            const r = row.original
            return (
              <TableRow
                key={row.id}
                className={cn(
                  "group h-11",
                  r.kind === "group" && "bg-muted/30 font-semibold hover:bg-muted/50",
                  r.kind === "department" && "font-medium",
                )}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={cn(
                      "py-2 tabular-nums",
                      groupStart.has(cell.column.id) && "border-l",
                      cell.column.id === "label" && cn(STICKY, STICKY_ROW_TINT, "pl-6", r.kind === "group" && "from-muted/30 to-muted/30"),
                      cell.column.id === "month-comment" && "px-2 py-1.5 whitespace-normal",
                      // Figure cells fill the td with their own focusable surface (hover bubble, C shortcut, right-click).
                      FIGURE_COLUMNS.has(cell.column.id) && "relative p-0",
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
    </Card>
  )
}

function LineCell({ row, month }: { row: Row<VarianceRow>; month: number }) {
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
      {r.kind === "line" ? <LineLink row={r} month={month} /> : <TruncatedText>{r.label}</TruncatedText>}
      {r.lineId && <PendingMarker lineId={r.lineId} />}
    </div>
  )
}

/**
 * Target 1 — the account name is a real link: underline + ↗ on row hover, so Cmd/middle-click opens
 * a new tab. Chevrons (expand in place) and ↗ (leave the table) never look alike.
 */
function LineLink({ row: r, month }: { row: VarianceRow; month: number }) {
  const name = r.accountCode && r.label.startsWith(`${r.accountCode} `) ? r.label.slice(r.accountCode.length + 1) : r.label
  return (
    <Link
      href={detailHref(r, month)}
      className="group/link flex min-w-0 items-center gap-1.5 rounded-sm pl-1 outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      {r.accountCode && <span className="shrink-0 text-muted-foreground tabular-nums">{r.accountCode}</span>}
      <TruncatedText className="decoration-foreground/40 underline-offset-4 group-hover:underline group-focus-visible/link:underline">
        {name}
      </TruncatedText>
      <ArrowUpRight
        className="size-3.5 shrink-0 text-blue-600 opacity-0 group-hover:opacity-100 group-focus-visible/link:opacity-100 dark:text-blue-400"
        aria-hidden
      />
    </Link>
  )
}

const formatCommentDate = (at: string) => new Date(at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })

/** Saves trimmed text; an empty body deletes, an unchanged one keeps the original author and date. */
function saveComment(save: (key: string, c: Commentary | null) => void, key: string, existing: Commentary | undefined, draft: string) {
  const body = draft.trim()
  if (body === (existing?.body ?? "")) return
  save(key, body ? { body, authorId: CURRENT_USER, at: new Date().toISOString() } : null)
}

function Initials({ authorId }: { authorId: Commentary["authorId"] }) {
  return (
    <span
      className="flex size-5 shrink-0 items-center justify-center rounded-full bg-fav-soft text-[10px] font-semibold text-fav"
      title={PEOPLE[authorId].name}
    >
      {PEOPLE[authorId].initials}
    </span>
  )
}

/** Target 2 — commentary is a plain editable cell: click (or Enter) and type, like a spreadsheet. */
function CommentaryCell({ lineId, month }: { lineId: string; month: number }) {
  const key = commentaryKey(lineId, month)
  const commentary = useCommentary((s) => s.byKey[key])
  const save = useCommentary((s) => s.save)
  const [editing, setEditing] = useState(false)

  if (editing) {
    return (
      <InlineNoteEditor
        initial={commentary?.body ?? ""}
        onDone={(draft) => {
          if (draft !== null) saveComment(save, key, commentary, draft)
          setEditing(false)
        }}
      />
    )
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      aria-label={commentary ? `Edit commentary: ${commentary.body}` : "Add commentary"}
      className="flex h-8 w-full min-w-0 cursor-text items-center rounded-md border border-transparent px-2 text-left text-xs outline-none hover:border-input hover:bg-background focus-visible:border-input focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      {commentary && <TruncatedText className="flex-1 text-foreground">{commentary.body}</TruncatedText>}
    </button>
  )
}

/** ⌘↵ saves, Esc cancels, clicking away saves (so a draft is never silently lost). */
function InlineNoteEditor({ initial, onDone }: { initial: string; onDone: (draft: string | null) => void }) {
  const [draft, setDraft] = useState(initial)
  const done = useRef(false)
  const finish = (value: string | null) => {
    if (done.current) return
    done.current = true
    onDone(value)
  }
  return (
    <div className="py-0.5">
      <Textarea
        autoFocus
        value={draft}
        onFocus={(e) => e.currentTarget.setSelectionRange(e.currentTarget.value.length, e.currentTarget.value.length)}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => finish(draft)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault()
            finish(draft)
          } else if (e.key === "Escape") {
            e.preventDefault()
            finish(null)
          }
        }}
        aria-label="Variance commentary"
        className="min-h-14 resize-none bg-background px-2 py-1.5 text-xs md:text-xs"
      />
    </div>
  )
}

/**
 * Target 3 — figures stay plain data (click selects / copies, default cursor). A comment is a
 * secondary action: bubble on hover, C on the focused cell, or right-click › Add comment.
 * Commented cells carry an Excel-style corner triangle.
 */
function FigureCell({
  rowId,
  month,
  columnId,
  value,
  className,
}: {
  rowId: string
  month: number
  columnId: string
  value: string
  className?: string
}) {
  const key = cellCommentKey(rowId, month, columnId)
  const comment = useCommentary((s) => s.byKey[key])
  const save = useCommentary((s) => s.save)
  const [open, setOpen] = useState(false)
  // Opening from the context menu: keep the menu from pulling focus back to the cell as it closes.
  const openingFromMenu = useRef(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <PopoverAnchor asChild>
            <div
              tabIndex={0}
              aria-label={comment ? `${value}, has comment` : value}
              onKeyDown={(e) => {
                if (e.key.toLowerCase() === "c" && !e.metaKey && !e.ctrlKey && !e.altKey) {
                  e.preventDefault()
                  setOpen(true)
                }
              }}
              className="group/cell absolute inset-0 flex cursor-default items-center justify-end px-2 outline-none hover:bg-foreground/[0.04] focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset"
            >
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setOpen(true)}
                aria-label={comment ? "Open comment" : "Add comment"}
                className={cn(
                  "absolute top-1/2 left-1.5 flex size-6 -translate-y-1/2 items-center justify-center rounded-md border bg-background text-muted-foreground shadow-xs hover:text-foreground",
                  open ? "opacity-100" : "opacity-0 group-hover/cell:opacity-100 group-focus-visible/cell:opacity-100",
                )}
              >
                <MessageSquare className="size-3" aria-hidden />
              </button>
              <span className={cn("whitespace-nowrap", className)}>{value}</span>
              {comment && (
                <span aria-hidden className="pointer-events-none absolute top-0 right-0 size-0 border-t-[7px] border-l-[7px] border-t-unfav border-l-transparent" />
              )}
            </div>
          </PopoverAnchor>
        </ContextMenuTrigger>
        <ContextMenuContent
          onCloseAutoFocus={(e) => {
            if (openingFromMenu.current) e.preventDefault()
            openingFromMenu.current = false
          }}
        >
          <ContextMenuItem
            onSelect={() => {
              openingFromMenu.current = true
              setOpen(true)
            }}
          >
            <MessageSquare /> {comment ? "Edit comment" : "Add comment"}
            <ContextMenuShortcut>C</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem onSelect={() => void navigator.clipboard?.writeText(value)}>
            <Copy /> Copy value
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      <PopoverContent align="end" className="w-80">
        <CommentPopoverForm
          comment={comment}
          onCancel={() => setOpen(false)}
          onSave={(draft) => {
            saveComment(save, key, comment, draft)
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}

function CommentPopoverForm({ comment, onSave, onCancel }: { comment: Commentary | undefined; onSave: (draft: string) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState(comment?.body ?? "")
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        onSave(draft)
      }}
    >
      {comment && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Initials authorId={comment.authorId} />
          <span className="truncate">
            {PEOPLE[comment.authorId].name} · {formatCommentDate(comment.at)}
          </span>
        </div>
      )}
      <Textarea
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault()
            onSave(draft)
          }
        }}
        placeholder="Comment on this figure"
        aria-label="Cell comment"
        className="min-h-20 text-sm"
      />
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">⌘↵ save · Esc cancel</span>
        <div className="flex shrink-0 gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" size="sm">
            Save
          </Button>
        </div>
      </div>
    </form>
  )
}
