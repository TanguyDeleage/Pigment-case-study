import { describe, expect, it } from "vitest"
import { LEDGER } from "@/lib/data"
import { CURRENT_MONTH } from "@/lib/data/calendar"
import { reclassImpact } from "./impact"
import { isCommentValid, routeApprover } from "./routing"
import { pendingForLine } from "./store"
import type { CorrectionRequest } from "./types"

describe("routeApprover", () => {
  it("sends corrections under €50k to the controller", () => {
    expect(routeApprover(48_000, "lea").approverId).toBe("claire")
  })
  it("sends €50k and above to the CFO", () => {
    expect(routeApprover(50_000, "lea").approverId).toBe("sophie")
  })
  it("never routes a request to its maker", () => {
    expect(routeApprover(1_000, "claire").approverId).toBe("sophie")
  })
})

describe("comment validation", () => {
  it("requires a meaningful comment", () => {
    expect(isCommentValid("fix")).toBe(false)
    expect(isCommentValid("Invoice is for the Sales EMEA Lisbon summit stand.")).toBe(true)
  })
})

describe("reclassImpact: Atelier Nord €48k from Marketing to Sales EMEA", () => {
  const rows = reclassImpact(
    LEDGER,
    { deptId: "marketing", accountCode: "6233" },
    { deptId: "sales-emea", accountCode: "6233" },
    48_000,
    CURRENT_MONTH,
  )
  const by = (key: string) => rows.find((r) => r.key === key)!

  it("clears both line flags", () => {
    expect(by("from-line")).toMatchObject({ before: { actual: 82_000 }, after: { actual: 34_000 }, attentionBefore: true, attentionAfter: false })
    expect(by("to-line")).toMatchObject({ before: { actual: 5_000 }, after: { actual: 53_000 }, attentionBefore: true, attentionAfter: false })
  })
  it("moves department totals without changing the company total", () => {
    expect(by("from-dept").after.actual - by("from-dept").before.actual).toBe(-48_000)
    expect(by("to-dept").after.actual - by("to-dept").before.actual).toBe(48_000)
  })
})

describe("pendingForLine", () => {
  const req: CorrectionRequest = {
    id: "CR-1",
    transactionId: "t",
    vendor: "Atelier Nord",
    amount: 48_000,
    from: { deptId: "marketing", accountCode: "6233" },
    to: { deptId: "sales-emea", accountCode: "6233" },
    reasonType: "wrong_cost_centre",
    comment: "",
    evidence: [],
    requesterId: "lea",
    approverId: "claire",
    status: "pending_approval",
    createdAt: "",
  }
  it("marks both source and destination lines, not drafts", () => {
    expect(pendingForLine([req], "marketing:6233")).toHaveLength(1)
    expect(pendingForLine([req], "sales-emea:6233")).toHaveLength(1)
    expect(pendingForLine([req], "rnd:6226")).toHaveLength(0)
    expect(pendingForLine([{ ...req, status: "draft" }], "marketing:6233")).toHaveLength(0)
  })
})
