/**
 * Pure aggregation over a ledger. Every number on screen comes from here:
 * line → department → group → company, month and YTD.
 */
import type { DepartmentId, Ledger, Line, Transaction } from "@/lib/data/types"
import { DEPARTMENT_ORDER, DEPARTMENTS, ACCOUNTS, lineLabel } from "@/lib/data/chart-of-accounts"
import { needsAttention, resultImpact, variance, variancePct, type LineType } from "./variance"

export interface Amounts {
  actual: number
  budget: number
}

export interface PeriodFigures {
  month: Amounts
  ytd: Amounts
}

const ZERO = (): PeriodFigures => ({ month: { actual: 0, budget: 0 }, ytd: { actual: 0, budget: 0 } })

const txIndex = new WeakMap<Ledger, Map<string, Transaction[]>>()

export function transactionsForLine(ledger: Ledger, lineId: string): Transaction[] {
  let index = txIndex.get(ledger)
  if (!index) {
    index = new Map()
    for (const t of ledger.transactions) {
      const list = index.get(t.lineId) ?? []
      list.push(t)
      index.set(t.lineId, list)
    }
    txIndex.set(ledger, index)
  }
  return index.get(lineId) ?? []
}

/** Number of closed months; the month after them is provisional (built from transactions). */
export function closedMonths(ledger: Ledger): number {
  return Object.values(ledger.closedActuals)[0]?.length ?? 0
}

/** Actual for one line and month: closed balance, provisional transactions, or null (no actuals yet). */
export function lineActual(ledger: Ledger, lineId: string, month: number): number | null {
  const closed = closedMonths(ledger)
  if (month < closed) return ledger.closedActuals[lineId][month]
  if (month === closed) return transactionsForLine(ledger, lineId).reduce((s, t) => s + t.amount, 0)
  return null
}

export function lineBudget(ledger: Ledger, lineId: string, month: number): number {
  return ledger.budget[lineId][month]
}

export function lineFigures(ledger: Ledger, lineId: string, month: number): PeriodFigures {
  const f = ZERO()
  for (let m = 0; m <= month; m++) {
    const actual = lineActual(ledger, lineId, m) ?? 0
    const budget = lineBudget(ledger, lineId, m)
    f.ytd.actual += actual
    f.ytd.budget += budget
    if (m === month) f.month = { actual, budget }
  }
  return f
}

export function sumFigures(list: PeriodFigures[]): PeriodFigures {
  return list.reduce((acc, f) => {
    acc.month.actual += f.month.actual
    acc.month.budget += f.month.budget
    acc.ytd.actual += f.ytd.actual
    acc.ytd.budget += f.ytd.budget
    return acc
  }, ZERO())
}

export function figuresFor(ledger: Ledger, lines: Line[], month: number): PeriodFigures {
  return sumFigures(lines.map((l) => lineFigures(ledger, l.id, month)))
}

export function linesOf(ledger: Ledger, filter: { type?: LineType; deptId?: DepartmentId }): Line[] {
  return ledger.lines.filter(
    (l) => (!filter.type || l.lineType === filter.type) && (!filter.deptId || l.deptId === filter.deptId),
  )
}

export function findLine(ledger: Ledger, lineId: string): Line | undefined {
  return ledger.lines.find((l) => l.id === lineId)
}

export function lineAttention(ledger: Ledger, lineId: string, month: number): boolean {
  const { month: m } = lineFigures(ledger, lineId, month)
  return needsAttention(m.actual, m.budget)
}

// ---------------------------------------------------------------- KPIs

export interface Kpis {
  revenue: PeriodFigures
  opex: PeriodFigures
  result: PeriodFigures
}

export function kpis(ledger: Ledger, month: number): Kpis {
  const revenue = figuresFor(ledger, linesOf(ledger, { type: "revenue" }), month)
  const opex = figuresFor(ledger, linesOf(ledger, { type: "expense" }), month)
  const diff = (a: Amounts, b: Amounts): Amounts => ({ actual: a.actual - b.actual, budget: a.budget - b.budget })
  return { revenue, opex, result: { month: diff(revenue.month, opex.month), ytd: diff(revenue.ytd, opex.ytd) } }
}

// ---------------------------------------------------------------- monthly series

export interface MonthPoint {
  month: number
  actual: number | null
  budget: number
  provisional: boolean
}

export function monthlySeries(ledger: Ledger, lines: Line[]): MonthPoint[] {
  const closed = closedMonths(ledger)
  return Array.from({ length: 12 }, (_, m) => {
    let actual: number | null = m <= closed ? 0 : null
    let budget = 0
    for (const l of lines) {
      budget += lineBudget(ledger, l.id, m)
      if (actual !== null) actual += lineActual(ledger, l.id, m) ?? 0
    }
    return { month: m, actual, budget, provisional: m === closed }
  })
}

// ---------------------------------------------------------------- variance tree

export type RowKind = "group" | "department" | "line"

export interface VarianceRow {
  id: string
  kind: RowKind
  label: string
  lineType: LineType
  deptId?: DepartmentId
  lineId?: string
  accountCode?: string
  figures: PeriodFigures
  /** Leaves: this line needs attention. Parents: own variance needs attention. */
  attention: boolean
  /** Count of leaf lines below (or self) that need attention. */
  attentionCount: number
  leafCount: number
  subRows?: VarianceRow[]
}

function leafRow(ledger: Ledger, line: Line, month: number): VarianceRow {
  const figures = lineFigures(ledger, line.id, month)
  const attention = needsAttention(figures.month.actual, figures.month.budget)
  return {
    id: line.id,
    kind: "line",
    label: lineLabel(line.accountCode),
    lineType: line.lineType,
    deptId: line.deptId ?? undefined,
    lineId: line.id,
    accountCode: line.accountCode,
    figures,
    attention,
    attentionCount: attention ? 1 : 0,
    leafCount: 1,
  }
}

function parentRow(
  id: string,
  kind: RowKind,
  label: string,
  lineType: LineType,
  subRows: VarianceRow[],
  deptId?: DepartmentId,
): VarianceRow {
  const figures = sumFigures(subRows.map((r) => r.figures))
  return {
    id,
    kind,
    label,
    lineType,
    deptId,
    figures,
    attention: needsAttention(figures.month.actual, figures.month.budget),
    attentionCount: subRows.reduce((s, r) => s + r.attentionCount, 0),
    leafCount: subRows.reduce((s, r) => s + r.leafCount, 0),
    subRows,
  }
}

export function buildVarianceTree(ledger: Ledger, month: number): VarianceRow[] {
  const revenue = parentRow(
    "revenue",
    "group",
    "Revenue",
    "revenue",
    linesOf(ledger, { type: "revenue" }).map((l) => leafRow(ledger, l, month)),
  )
  const departments = DEPARTMENT_ORDER.map((deptId) =>
    parentRow(
      `dept:${deptId}`,
      "department",
      DEPARTMENTS[deptId].name,
      "expense",
      linesOf(ledger, { deptId }).map((l) => leafRow(ledger, l, month)),
      deptId,
    ),
  )
  const expenses = parentRow("expenses", "group", "Expenses", "expense", departments)
  return [revenue, expenses]
}

// ---------------------------------------------------------------- waterfall

export interface WaterfallStep {
  key: string
  label: string
  sublabel?: string
  kind: "total-budget" | "delta" | "total-actual"
  /** Effect on operating result (expenses flipped). For totals: the total itself. */
  value: number
  /** Revenue: variance % of revenue; departments: spend variance %. */
  pct: number | null
  lineType?: LineType
  deptIds?: DepartmentId[]
  attentionCount: number
}

/**
 * Bridge from budgeted to actual operating result for one month.
 * Departments with lines needing attention get their own step; the rest are grouped as "Others".
 */
export function operatingResultBridge(ledger: Ledger, month: number): WaterfallStep[] {
  const tree = buildVarianceTree(ledger, month)
  const [revenue, expenses] = tree
  const k = kpis(ledger, month)
  const depts = expenses.subRows ?? []
  const flagged = depts.filter((d) => d.attentionCount > 0)
  const others = depts.filter((d) => d.attentionCount === 0)

  const deptStep = (rows: VarianceRow[], key: string, label: string, sublabel?: string): WaterfallStep => {
    const f = sumFigures(rows.map((r) => r.figures)).month
    return {
      key,
      label,
      sublabel,
      kind: "delta",
      value: resultImpact("expense", variance(f.actual, f.budget)),
      pct: variancePct(f.actual, f.budget),
      lineType: "expense",
      deptIds: rows.map((r) => r.deptId as DepartmentId),
      attentionCount: rows.reduce((s, r) => s + r.attentionCount, 0),
    }
  }

  const steps: WaterfallStep[] = [
    { key: "budget", label: "Budget", sublabel: "BU", kind: "total-budget", value: k.result.month.budget, pct: null, attentionCount: 0 },
    {
      key: "revenue",
      label: "Revenue",
      kind: "delta",
      value: variance(revenue.figures.month.actual, revenue.figures.month.budget),
      pct: variancePct(revenue.figures.month.actual, revenue.figures.month.budget),
      lineType: "revenue",
      attentionCount: revenue.attentionCount,
    },
    ...flagged.map((d) => deptStep([d], d.deptId as string, d.label)),
  ]
  if (others.length) steps.push(deptStep(others, "others", "Others", `${others.length} depts`))
  steps.push({
    key: "actual",
    label: "Actual",
    sublabel: "AC · prov.",
    kind: "total-actual",
    value: k.result.month.actual,
    pct: variancePct(k.result.month.actual, k.result.month.budget),
    attentionCount: 0,
  })
  return steps
}

// ---------------------------------------------------------------- investigation helpers

export interface RelatedVariance {
  line: Line
  figures: PeriodFigures
}

/**
 * Mirror-image variances: same GL account in another cost centre, opposite sign,
 * also needing attention. A classic symptom of spend coded to the wrong cost centre.
 */
export function relatedVariances(ledger: Ledger, lineId: string, month: number): RelatedVariance[] {
  const line = findLine(ledger, lineId)
  if (!line) return []
  const own = lineFigures(ledger, lineId, month).month
  const ownVar = variance(own.actual, own.budget)
  return ledger.lines
    .filter((l) => l.id !== lineId && l.accountCode === line.accountCode && l.lineType === line.lineType)
    .map((l) => ({ line: l, figures: lineFigures(ledger, l.id, month) }))
    .filter(({ figures: { month: m } }) => {
      const v = variance(m.actual, m.budget)
      return Math.sign(v) === -Math.sign(ownVar) && needsAttention(m.actual, m.budget)
    })
}

export interface VendorRow {
  vendor: string
  month: number
  priorTotal: number
  priorMonthlyAvg: number
  share: number
  transactions: Transaction[]
  outlier: boolean
  outlierReason?: string
}

/**
 * Vendor breakdown for one line: provisional-month spend per vendor against its
 * monthly average over the closed months. Outlier = large share of the month and
 * either new to this line or more than 3× its usual monthly spend.
 */
export function vendorBreakdown(
  ledger: Ledger,
  lineId: string,
  priorTotals: Record<string, number>,
): VendorRow[] {
  const closed = closedMonths(ledger)
  const txs = transactionsForLine(ledger, lineId)
  const total = txs.reduce((s, t) => s + t.amount, 0)
  const byVendor = new Map<string, Transaction[]>()
  for (const t of txs) byVendor.set(t.vendor, [...(byVendor.get(t.vendor) ?? []), t])

  const rows: VendorRow[] = [...byVendor.entries()].map(([vendor, list]) => {
    const month = list.reduce((s, t) => s + t.amount, 0)
    const priorTotal = priorTotals[vendor] ?? 0
    const priorMonthlyAvg = closed ? priorTotal / closed : 0
    const share = total ? month / total : 0
    const isNew = priorTotal === 0
    const outlier = share >= 0.25 && (isNew || month > 3 * priorMonthlyAvg)
    return {
      vendor,
      month,
      priorTotal,
      priorMonthlyAvg,
      share,
      transactions: list,
      outlier,
      outlierReason: outlier ? (isNew ? "New vendor on this line" : `${(month / priorMonthlyAvg).toFixed(1)}× usual month`) : undefined,
    }
  })
  for (const [vendor, priorTotal] of Object.entries(priorTotals)) {
    if (!byVendor.has(vendor))
      rows.push({ vendor, month: 0, priorTotal, priorMonthlyAvg: priorTotal / closed, share: 0, transactions: [], outlier: false })
  }
  return rows.sort((a, b) => b.month - a.month || b.priorTotal - a.priorTotal)
}

export function accountName(code: string): string {
  return ACCOUNTS[code]?.name ?? code
}
