import { lineId as toLineId } from "@/lib/data/chart-of-accounts"
import type { Ledger } from "@/lib/data/types"
import { figuresFor, lineFigures, linesOf, type Amounts } from "@/lib/finance/aggregate"
import { needsAttention } from "@/lib/finance/variance"
import type { Coding } from "./types"

export interface ImpactRow {
  key: string
  scope: "line" | "department"
  coding: Coding
  before: Amounts
  after: Amounts
  attentionBefore: boolean
  attentionAfter: boolean
}

/**
 * Before/after month figures if `amount` moved from one coding to another.
 * Actuals are not changed: this is a projection shown in the request.
 */
export function reclassImpact(ledger: Ledger, from: Coding, to: Coding, amount: number, month: number): ImpactRow[] {
  const row = (key: string, scope: ImpactRow["scope"], coding: Coding, before: Amounts, delta: number): ImpactRow => {
    const after = { actual: before.actual + delta, budget: before.budget }
    return {
      key,
      scope,
      coding,
      before,
      after,
      attentionBefore: needsAttention(before.actual, before.budget),
      attentionAfter: needsAttention(after.actual, after.budget),
    }
  }
  const lineMonth = (c: Coding) => lineFigures(ledger, toLineId(c.deptId, c.accountCode), month).month
  const deptMonth = (c: Coding) => figuresFor(ledger, linesOf(ledger, { deptId: c.deptId }), month).month

  const rows = [
    row("from-line", "line", from, lineMonth(from), -amount),
    row("to-line", "line", to, lineMonth(to), amount),
  ]
  if (from.deptId !== to.deptId) {
    rows.push(row("from-dept", "department", from, deptMonth(from), -amount))
    rows.push(row("to-dept", "department", to, deptMonth(to), amount))
  }
  return rows
}
