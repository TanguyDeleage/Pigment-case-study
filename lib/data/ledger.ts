/**
 * Builds the in-memory ledger from the reference anchors.
 * Closed months (Jan–Sep) are line balances; October is a list of transactions.
 * Generation is deterministic (seeded) so every reload shows the same numbers.
 */
import { CURRENT_MONTH } from "./calendar"
import { ACCOUNTS, DEPARTMENT_ORDER, REVENUE_ACCOUNTS, lineId } from "./chart-of-accounts"
import { COMPANY_MONTHLY, DEPARTMENT_ANCHORS, OTHER_DEPARTMENT_SHARES, STORY_LINES } from "./reference"
import { STORY_TRANSACTIONS } from "./story"
import type { CodingSource, DepartmentId, Ledger, Line, Monthly, Transaction } from "./types"

const K = 1_000

/** Account weights within each department; story lines carry their own profile (weight 0). */
const DEPARTMENT_LINES: Record<DepartmentId, Record<string, number>> = {
  marketing: { "6411": 0.4, "6451": 0.17, "6231": 0.22, "6233": 0, "6226": 0.07, "6251": 0.04, "6135": 0.06, "6236": 0.04 },
  "sales-emea": { "6411": 0.48, "6451": 0.2, "6222": 0.14, "6233": 0, "6251": 0.07, "6257": 0.04, "6226": 0.03, "6135": 0.04 },
  rnd: { "6411": 0.56, "6451": 0.22, "6226": 0, "6156": 0.12, "6135": 0.05, "6251": 0.02, "6064": 0.02, "6333": 0.01 },
  "sales-americas": { "6411": 0.48, "6451": 0.18, "6222": 0.15, "6233": 0.05, "6251": 0.07, "6257": 0.03, "6226": 0.02, "6135": 0.02 },
  "customer-success": { "6411": 0.58, "6451": 0.23, "6135": 0.07, "6251": 0.04, "6226": 0.04, "6257": 0.02, "6333": 0.02 },
  "g-and-a": { "6411": 0.34, "6451": 0.13, "6132": 0.18, "6227": 0.07, "6226": 0.08, "6135": 0.06, "6262": 0.03, "6161": 0.04, "6064": 0.03, "6251": 0.04 },
  people: { "6411": 0.45, "6451": 0.18, "6288": 0.14, "6333": 0.08, "6226": 0.05, "6135": 0.04, "6251": 0.03, "6257": 0.03 },
}

const REVENUE_WEIGHTS: Record<string, number> = { "7061": 0.89, "7062": 0.085, "7088": 0.025 }

const VENDORS: Record<string, string[]> = {
  "6064": ["Bureau Vallée", "LDLC Pro"],
  "6132": ["SCI Rivoli Bureaux"],
  "6135": ["Figma", "Atlassian", "Notion", "Salesforce", "Datadog", "GitHub"],
  "6156": ["AWS", "Google Cloud", "Cloudflare"],
  "6161": ["Hiscox"],
  "6222": ["Partner commissions run"],
  "6226": ["Northfield Consulting", "Lumen Advisory", "Kestrel Data Labs", "Bramble & Co"],
  "6227": ["Cabinet Martel Avocats"],
  "6231": ["LinkedIn Ads", "Google Ads", "Meta Ads"],
  "6233": ["Halle Parc Expo", "Event Ticketing Ltd", "Pixel Print Co"],
  "6236": ["Pixel Print Co"],
  "6251": ["Air France", "SNCF", "Booking.com", "Uber"],
  "6257": ["Le Petit Zinc", "Sodexo", "Deliveroo for Business"],
  "6262": ["Orange Business"],
  "6288": ["Welcome to the Jungle", "Hays"],
  "6333": ["OpenClassrooms", "Coursera"],
}

/** Largest-remainder allocation of an integer total across weights. */
export function allocate(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0)
  const raw = weights.map((w) => (total * w) / sum)
  const floored = raw.map(Math.floor)
  let remainder = total - floored.reduce((a, b) => a + b, 0)
  const order = raw.map((r, i) => ({ i, frac: r - Math.floor(r) })).sort((a, b) => b.frac - a.frac || a.i - b.i)
  for (const { i } of order) {
    if (remainder <= 0) break
    floored[i] += 1
    remainder -= 1
  }
  return floored
}

function seeded(key: string): () => number {
  let h = 2166136261
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619)
  let a = h >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const range = (n: number) => Array.from({ length: n }, (_, i) => i)
const YEAR_MONTHS = range(12)

/** Department totals per month, in euros. Actual covers Jan..Oct, budget Jan..Dec. */
function departmentTotals(): Record<DepartmentId, { actual: Monthly; budget: Monthly }> {
  const company = COMPANY_MONTHLY.opex
  const companyYtdBudget = company.budget.slice(0, CURRENT_MONTH + 1).reduce((a, b) => a + b, 0)
  const result = {} as Record<DepartmentId, { actual: Monthly; budget: Monthly }>
  const named = Object.entries(DEPARTMENT_ANCHORS) as [DepartmentId, NonNullable<(typeof DEPARTMENT_ANCHORS)[DepartmentId]>][]

  for (const [id, a] of named) {
    const closedActual = allocate((a.ytd.actual - a.oct.actual) * K, company.actual.slice(0, CURRENT_MONTH))
    const closedBudget = allocate((a.ytd.budget - a.oct.budget) * K, company.budget.slice(0, CURRENT_MONTH))
    const futureBudget = company.budget
      .slice(CURRENT_MONTH + 1)
      .map((m) => Math.round((m * a.ytd.budget) / companyYtdBudget) * K)
    result[id] = {
      actual: [...closedActual, a.oct.actual * K],
      budget: [...closedBudget, a.oct.budget * K, ...futureBudget],
    }
  }

  const others = Object.entries(OTHER_DEPARTMENT_SHARES) as [DepartmentId, number][]
  const otherIds = others.map(([id]) => id)
  const shares = others.map(([, s]) => s)
  for (const id of otherIds) result[id] = { actual: [], budget: [] }
  const remainder = (series: number[], key: "actual" | "budget", m: number) =>
    series[m] * K - named.reduce((sum, [id]) => sum + result[id][key][m], 0)

  for (const m of YEAR_MONTHS) {
    const budgetSplit = allocate(remainder(company.budget, "budget", m), shares)
    otherIds.forEach((id, i) => result[id].budget.push(budgetSplit[i]))
    if (m <= CURRENT_MONTH) {
      const actualSplit = allocate(remainder(company.actual, "actual", m), shares)
      otherIds.forEach((id, i) => result[id].actual.push(actualSplit[i]))
    }
  }
  return result
}

/** ±2% deterministic noise on actual weights, so lines don't all share one variance %. */
function jittered(ids: string[], weights: number[], month: number): number[] {
  return weights.map((w, i) => w * (1 + (seeded(`${ids[i]}:${month}`)() - 0.5) * 0.04))
}

function splitLines(
  ids: string[],
  weights: number[],
  totals: { actual: Monthly; budget: Monthly },
  fixed: Record<string, { budget: Monthly; actual: Monthly }>,
) {
  const budget: Record<string, Monthly> = {}
  const actual: Record<string, Monthly> = {}
  for (const id of ids) {
    budget[id] = []
    actual[id] = []
  }
  const free = ids.filter((id) => !fixed[id])
  const freeWeights = free.map((id) => weights[ids.indexOf(id)])

  const fill = (key: "budget" | "actual", m: number, total: number) => {
    const fixedSum = Object.values(fixed).reduce((s, f) => s + f[key][m], 0)
    const w = key === "actual" ? jittered(free, freeWeights, m) : freeWeights
    const split = allocate(total - fixedSum, w)
    free.forEach((id, i) => (key === "budget" ? budget : actual)[id].push(split[i]))
    for (const [id, f] of Object.entries(fixed)) (key === "budget" ? budget : actual)[id].push(f[key][m])
  }

  for (const m of YEAR_MONTHS) {
    fill("budget", m, totals.budget[m])
    if (m <= CURRENT_MONTH) fill("actual", m, totals.actual[m])
  }
  return { budget, actual }
}

function storyFixed(ids: string[]) {
  const fixed: Record<string, { budget: Monthly; actual: Monthly }> = {}
  for (const id of ids) {
    const story = STORY_LINES[id]
    if (!story) continue
    const october = STORY_TRANSACTIONS.filter((t) => t.lineId === id).reduce((s, t) => s + t.amount, 0)
    fixed[id] = { budget: story.budget.map((v) => v * K), actual: [...story.closedActual.map((v) => v * K), october] }
  }
  return fixed
}

let txCounter = 5000

function generateTransactions(line: Line, amount: number): Transaction[] {
  const rand = seeded(`tx:${line.id}`)
  const day = () => String(1 + Math.floor(rand() * 28)).padStart(2, "0")
  const make = (vendor: string, description: string, value: number, codingSource: CodingSource): Transaction => ({
    id: `JE-2026-10-${String(txCounter++).padStart(5, "0")}`,
    lineId: line.id,
    postingDate: `2026-10-${day()}`,
    vendor,
    description,
    amount: value,
    codingSource,
    invoiceRef: `INV-${Math.floor(rand() * 90000 + 10000)}`,
  })

  const code = line.accountCode
  if (code === "6411") return [make("Payroll (internal)", "Payroll, October", amount, "recurring")]
  if (code === "6451") return [make("URSSAF", "Employer social charges, October", amount, "recurring")]
  if (line.lineType === "revenue") {
    const labels = ["Billing run, monthly plans", "Billing run, annual renewals", "Usage and overage"]
    const parts = allocate(amount, [0.55, 0.35, 0.1])
    return parts.map((p, i) => make("Customer billing", `${ACCOUNTS[code].name}: ${labels[i]}`, p, "recurring"))
  }

  const pool = VENDORS[code] ?? ["Miscellaneous supplier"]
  const count = Math.min(pool.length, 2 + Math.floor(rand() * 3))
  const parts = allocate(amount, range(count).map(() => 0.5 + rand()))
  return parts.map((p, i) => make(pool[i], `${ACCOUNTS[code].name}, October`, p, rand() > 0.5 ? "po_match" : "vendor_default"))
}

export function buildLedger(): Ledger {
  txCounter = 5000
  const lines: Line[] = []
  const budget: Record<string, Monthly> = {}
  const closedActuals: Record<string, Monthly> = {}
  const transactions: Transaction[] = [...STORY_TRANSACTIONS]

  const addGroup = (
    groupLines: Line[],
    weights: number[],
    totals: { actual: Monthly; budget: Monthly },
  ) => {
    const ids = groupLines.map((l) => l.id)
    const fixed = storyFixed(ids)
    const split = splitLines(ids, weights, totals, fixed)
    for (const line of groupLines) {
      lines.push(line)
      budget[line.id] = split.budget[line.id]
      closedActuals[line.id] = split.actual[line.id].slice(0, CURRENT_MONTH)
      if (!fixed[line.id]) transactions.push(...generateTransactions(line, split.actual[line.id][CURRENT_MONTH]))
    }
  }

  const revenueLines = REVENUE_ACCOUNTS.map<Line>((code) => ({
    id: lineId(null, code),
    deptId: null,
    accountCode: code,
    lineType: "revenue",
  }))
  addGroup(
    revenueLines,
    REVENUE_ACCOUNTS.map((c) => REVENUE_WEIGHTS[c]),
    {
      actual: COMPANY_MONTHLY.revenue.actual.map((v) => v * K),
      budget: COMPANY_MONTHLY.revenue.budget.map((v) => v * K),
    },
  )

  const deptTotals = departmentTotals()
  for (const deptId of DEPARTMENT_ORDER) {
    const codes = Object.keys(DEPARTMENT_LINES[deptId])
    const deptLines = codes.map<Line>((code) => ({
      id: lineId(deptId, code),
      deptId,
      accountCode: code,
      lineType: "expense",
    }))
    addGroup(deptLines, codes.map((c) => DEPARTMENT_LINES[deptId][c]), deptTotals[deptId])
  }

  return { lines, budget, closedActuals, transactions }
}
