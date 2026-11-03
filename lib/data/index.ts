import { buildLedger } from "./ledger"

export * from "./types"
export * from "./calendar"
export * from "./chart-of-accounts"
export * from "./people"
export {
  ATELIER_NORD_TX_ID,
  BUDGET_NOTES,
  DEFAULT_BUDGET_NOTE,
  MARKETING_6233_VENDOR_HISTORY,
  PURCHASE_ORDERS,
  VENDOR_DEFAULTS,
  VENDOR_HISTORY,
  type BudgetNote,
} from "./story"

/** The single in-memory ledger. A page reload rebuilds it identically. */
export const LEDGER = buildLedger()
