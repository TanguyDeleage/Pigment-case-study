/**
 * Reference figures from the approved dashboard mockup (docs/mockups/dashboard.png).
 * Everything the UI shows is derived from the ledger built on these anchors;
 * lib/data/reference.test.ts checks that the derived numbers reproduce them.
 * Amounts in €k.
 */
import type { DepartmentId } from "./types"

export const COMPANY_MONTHLY = {
  revenue: {
    actual: [22_100, 22_600, 23_000, 23_400, 23_800, 24_200, 24_500, 24_800, 25_380, 25_120],
    budget: [22_000, 22_400, 22_800, 23_100, 23_500, 23_900, 24_200, 24_500, 24_600, 25_000, 25_400, 25_800],
  },
  opex: {
    actual: [20_300, 20_500, 20_700, 21_100, 22_600, 20_900, 20_700, 20_090, 22_559, 21_851],
    budget: [20_200, 20_400, 20_800, 21_000, 22_400, 20_940, 20_600, 20_190, 22_170, 21_800, 22_000, 22_600],
  },
}

interface DeptAnchor {
  oct: { actual: number; budget: number }
  ytd: { actual: number; budget: number }
}

/** Departments named in the mockup. The other four share the remainder ("Others"). */
export const DEPARTMENT_ANCHORS: Partial<Record<DepartmentId, DeptAnchor>> = {
  marketing: { oct: { actual: 1_170, budget: 1_100 }, ytd: { actual: 11_620, budget: 11_450 } },
  "sales-emea": { oct: { actual: 1_400, budget: 1_450 }, ytd: { actual: 14_190, budget: 14_300 } },
  rnd: { oct: { actual: 9_235, budget: 9_200 }, ytd: { actual: 92_050, budget: 91_800 } },
}

/** Split of the "Others" remainder across the four smaller departments. */
export const OTHER_DEPARTMENT_SHARES: Partial<Record<DepartmentId, number>> = {
  "sales-americas": 0.3,
  "customer-success": 0.18,
  "g-and-a": 0.32,
  people: 0.2,
}

/** Lines with a fixed monthly profile (Jan..Dec budget, Jan..Sep closed actuals), €k. */
export const STORY_LINES: Record<string, { budget: number[]; closedActual: number[] }> = {
  "marketing:6233": {
    budget: [60, 80, 200, 140, 150, 220, 40, 20, 300, 30, 140, 40],
    closedActual: [58, 84, 204, 136, 152, 226, 38, 22, 310],
  },
  "sales-emea:6233": {
    budget: [20, 30, 50, 40, 50, 60, 20, 10, 80, 50, 60, 30],
    closedActual: [18, 32, 49, 41, 52, 58, 19, 9, 79],
  },
  "rnd:6226": {
    budget: [244, 244, 244, 244, 244, 244, 244, 244, 244, 244, 244, 244],
    closedActual: [240, 245, 250, 244, 247, 243, 246, 249, 250],
  },
}
