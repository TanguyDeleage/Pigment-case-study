/** Typographic minus, so signed numbers align with "+" in tabular columns. */
export const MINUS = "−"

type Unit = "M" | "k" | "unit"

interface FormatEurOptions {
  unit?: Unit
  decimals?: number
  signed?: boolean
  /** Omit the € symbol (table cells where the header carries the unit). */
  symbol?: boolean
}

const SCALE: Record<Unit, number> = { M: 1_000_000, k: 1_000, unit: 1 }

function formatNumber(value: number, decimals: number): string {
  return new Intl.NumberFormat("en-GB", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

/** Round to the displayed precision first so "-0.04" never renders as "−0.0". */
function roundTo(value: number, decimals: number): number {
  const f = 10 ** decimals
  const r = Math.round(Math.abs(value) * f) / f
  return value < 0 ? -r : r
}

function sign(value: number, signed: boolean): string {
  if (!signed) return value < 0 ? MINUS : ""
  if (value > 0) return "+"
  if (value < 0) return MINUS
  return "" // zero carries no sign
}

/**
 * Formats euros. Amounts are stored in whole euros.
 * formatEur(120_000, { unit: "k", signed: true }) → "+€120k"
 * formatEur(25_120_000, { unit: "M", decimals: 2 }) → "€25.12M"
 */
export function formatEur(value: number, opts: FormatEurOptions = {}): string {
  const { unit = "k", decimals = 0, signed = false, symbol = true } = opts
  const scaled = roundTo(value / SCALE[unit], decimals)
  const body = formatNumber(Math.abs(scaled), decimals)
  const suffix = unit === "unit" ? "" : unit
  return `${sign(scaled, signed)}${symbol ? "€" : ""}${body}${suffix}`
}

/** Plain number in €k for table cells: "25,120", "+52.0", "−45.0". */
export function formatK(value: number, opts: { decimals?: number; signed?: boolean } = {}): string {
  return formatEur(value, { unit: "k", symbol: false, ...opts }).replace(/k$/, "")
}

/** "+173%", "+6.4%", "−90%", "0.0%". One decimal below 50%, none above (big swings need no precision). Null → "Unbudgeted". */
export function formatPct(pct: number | null, opts: { signed?: boolean; decimals?: number } = {}): string {
  if (pct === null) return "Unbudgeted"
  const { signed = true } = opts
  const value = pct * 100
  const decimals = opts.decimals ?? (Math.abs(value) >= 49.95 ? 0 : 1)
  const r = roundTo(value, decimals)
  return `${sign(r, signed)}${formatNumber(Math.abs(r), decimals)}%`
}

/** Table rows with small amounts (both AC and BU under €100k) show one decimal. */
export function rowDecimals(actual: number, budget: number): number {
  return Math.abs(actual) < 100_000 && Math.abs(budget) < 100_000 ? 1 : 0
}

/** "€48,000.00" for transaction-level amounts. */
export function formatEurExact(value: number): string {
  const body = new Intl.NumberFormat("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    Math.abs(value),
  )
  return `${value < 0 ? MINUS : ""}€${body}`
}
