import { describe, expect, it } from "vitest"
import { LEDGER, MARKETING_6233_VENDOR_HISTORY } from "@/lib/data"
import { CURRENT_MONTH } from "@/lib/data/calendar"
import { relatedVariances, vendorBreakdown } from "./aggregate"
import { formatEur, formatK, formatPct, rowDecimals } from "./format"
import { isFavourable, needsAttention, resultImpact, variance, variancePct } from "./variance"

describe("variance", () => {
  it("is AC − BU, % over |BU|", () => {
    expect(variance(82_000, 30_000)).toBe(52_000)
    expect(variancePct(82_000, 30_000)).toBeCloseTo(1.7333, 4)
    expect(variancePct(-90, -100)).toBeCloseTo(0.1)
  })
  it("returns null % when unbudgeted", () => {
    expect(variancePct(5_000, 0)).toBeNull()
  })
})

describe("isFavourable follows impact on profit, not sign", () => {
  it.each([
    ["revenue", 120_000, true],
    ["revenue", -1, false],
    ["expense", 51_000, false],
    ["expense", -45_000, true],
    ["expense", 0, true],
  ] as const)("%s %d → %s", (type, v, fav) => expect(isFavourable(type, v)).toBe(fav))

  it("flips expense variance into operating-result impact", () => {
    expect(resultImpact("expense", 70_000)).toBe(-70_000)
    expect(resultImpact("revenue", 120_000)).toBe(120_000)
  })
})

describe("needsAttention: |Var| > 5% and > €10k", () => {
  it.each([
    [82_000, 30_000, true],
    [266_000, 244_000, true],
    [1_170_000, 1_100_000, true],
    [1_400_000, 1_450_000, false], // −3.4%
    [34_000, 30_000, false], // +13% but only €4k
    [15_000, 0, true], // unbudgeted above €10k
    [9_000, 0, false],
  ])("AC %d BU %d → %s", (ac, bu, expected) => expect(needsAttention(ac, bu)).toBe(expected))
})

describe("formatting", () => {
  it("KPI amounts", () => {
    expect(formatEur(25_120_000, { unit: "M", decimals: 2 })).toBe("€25.12M")
    expect(formatEur(120_000, { unit: "k", signed: true })).toBe("+€120k")
    expect(formatEur(800_000, { unit: "M", decimals: 1, signed: true })).toBe("+€0.8M")
    expect(formatEur(-48_000, { unit: "k" })).toBe("−€48k")
  })
  it("table cells", () => {
    expect(formatK(25_120_000)).toBe("25,120")
    expect(formatK(52_000, { decimals: 1, signed: true })).toBe("+52.0")
    expect(formatK(-45_000, { decimals: 1, signed: true })).toBe("−45.0")
    expect(rowDecimals(82_000, 30_000)).toBe(1)
    expect(rowDecimals(266_000, 244_000)).toBe(0)
  })
  it("percentages", () => {
    expect(formatPct(52 / 30)).toBe("+173%")
    expect(formatPct(-0.9)).toBe("−90%")
    expect(formatPct(-48 / 410)).toBe("−11.7%")
    expect(formatPct(-0.0004)).toBe("±0.0%")
    expect(formatPct(null)).toBe("Unbudgeted")
  })
})

describe("investigation helpers", () => {
  it("finds the mirror-image variance on Sales EMEA 6233", () => {
    const related = relatedVariances(LEDGER, "marketing:6233", CURRENT_MONTH)
    expect(related.map((r) => r.line.id)).toEqual(["sales-emea:6233"])
  })
  it("flags Atelier Nord as the only vendor outlier", () => {
    const rows = vendorBreakdown(LEDGER, "marketing:6233", MARKETING_6233_VENDOR_HISTORY)
    expect(rows.filter((r) => r.outlier).map((r) => r.vendor)).toEqual(["Atelier Nord"])
    expect(rows[0]).toMatchObject({ vendor: "Atelier Nord", month: 48_000, outlierReason: "New vendor on this line" })
    expect(rows.reduce((s, r) => s + r.priorTotal, 0)).toBe(1_230_000)
  })
})
