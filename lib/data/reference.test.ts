import { describe, expect, it } from "vitest"
import {
  buildVarianceTree,
  kpis,
  monthlySeries,
  linesOf,
  operatingResultBridge,
  type VarianceRow,
} from "@/lib/finance/aggregate"
import { CURRENT_MONTH } from "./calendar"
import { LEDGER } from "./index"

const k = (v: number) => Math.round(v / 1000)
const flat = (rows: VarianceRow[]): VarianceRow[] => rows.flatMap((r) => [r, ...flat(r.subRows ?? [])])
const tree = buildVarianceTree(LEDGER, CURRENT_MONTH)
const row = (id: string) => flat(tree).find((r) => r.id === id)!
const kk = (r: VarianceRow) => ({
  oct: [k(r.figures.month.actual), k(r.figures.month.budget)],
  ytd: [k(r.figures.ytd.actual), k(r.figures.ytd.budget)],
})

describe("ledger reproduces the mockup figures (€k)", () => {
  it("KPI tiles", () => {
    const x = kpis(LEDGER, CURRENT_MONTH)
    expect([k(x.revenue.month.actual), k(x.revenue.month.budget)]).toEqual([25_120, 25_000])
    expect([k(x.opex.month.actual), k(x.opex.month.budget)]).toEqual([21_851, 21_800])
    expect([k(x.result.month.actual), k(x.result.month.budget)]).toEqual([3_269, 3_200])
    expect([k(x.revenue.ytd.actual), k(x.revenue.ytd.budget)]).toEqual([238_900, 236_000])
    expect([k(x.opex.ytd.actual), k(x.opex.ytd.budget)]).toEqual([211_300, 210_500])
    expect([k(x.result.ytd.actual), k(x.result.ytd.budget)]).toEqual([27_600, 25_500])
  })

  it("variance table rows", () => {
    expect(kk(row("dept:marketing"))).toEqual({ oct: [1_170, 1_100], ytd: [11_620, 11_450] })
    expect(kk(row("dept:sales-emea"))).toEqual({ oct: [1_400, 1_450], ytd: [14_190, 14_300] })
    expect(kk(row("dept:rnd"))).toEqual({ oct: [9_235, 9_200], ytd: [92_050, 91_800] })
    expect(kk(row("marketing:6233"))).toEqual({ oct: [82, 30], ytd: [1_312, 1_240] })
    expect(kk(row("sales-emea:6233"))).toEqual({ oct: [5, 50], ytd: [362, 410] })
    expect(kk(row("rnd:6226"))).toEqual({ oct: [266, 244], ytd: [2_480, 2_440] })
  })

  it("exactly the three story lines need attention in October", () => {
    const flagged = flat(tree).filter((r) => r.kind === "line" && r.attention).map((r) => r.id)
    expect(flagged.sort()).toEqual(["marketing:6233", "rnd:6226", "sales-emea:6233"])
  })

  it("4 departments and 57 accounts sit within threshold", () => {
    const depts = row("expenses").subRows!
    expect(depts.filter((d) => d.attentionCount === 0)).toHaveLength(4)
    const leaves = flat(tree).filter((r) => r.kind === "line")
    expect(leaves.filter((r) => !r.attention)).toHaveLength(57)
  })

  it("waterfall bridges 3,200 to 3,269", () => {
    const steps = operatingResultBridge(LEDGER, CURRENT_MONTH)
    expect(steps.map((s) => [s.key, k(s.value)])).toEqual([
      ["budget", 3_200],
      ["revenue", 120],
      ["marketing", -70],
      ["sales-emea", 50],
      ["rnd", -35],
      ["others", 4],
      ["actual", 3_269],
    ])
  })

  it("monthly chart values round to the mockup labels", () => {
    const rev = monthlySeries(LEDGER, linesOf(LEDGER, { type: "revenue" }))
    const opex = monthlySeries(LEDGER, linesOf(LEDGER, { type: "expense" }))
    const r1 = (v: number | null) => (v === null ? null : Math.round(v / 100_000) / 10)
    expect(rev.map((p) => r1(p.actual))).toEqual([22.1, 22.6, 23, 23.4, 23.8, 24.2, 24.5, 24.8, 25.4, 25.1, null, null])
    expect(opex.map((p) => r1(p.actual))).toEqual([20.3, 20.5, 20.7, 21.1, 22.6, 20.9, 20.7, 20.1, 22.6, 21.9, null, null])
    expect(rev.slice(10).map((p) => r1(p.budget))).toEqual([25.4, 25.8])
    expect(opex.slice(10).map((p) => r1(p.budget))).toEqual([22, 22.6])
  })
})
