export type LineType = "revenue" | "expense"

/** Materiality rule: a variance needs attention when both thresholds are exceeded. */
export const ATTENTION_THRESHOLD = { pct: 0.05, abs: 10_000 } as const

export function variance(actual: number, budget: number): number {
  return actual - budget
}

/** (AC − BU) / |BU|. Returns null when the budget is zero ("Unbudgeted"). */
export function variancePct(actual: number, budget: number): number | null {
  if (budget === 0) return null
  return (actual - budget) / Math.abs(budget)
}

/**
 * Colour follows impact on profit, not the sign:
 * revenue above budget is favourable, expense above budget is unfavourable.
 * A zero variance counts as favourable (on budget).
 */
export function isFavourable(lineType: LineType, varianceValue: number): boolean {
  return lineType === "revenue" ? varianceValue >= 0 : varianceValue <= 0
}

export function needsAttention(actual: number, budget: number): boolean {
  const v = variance(actual, budget)
  const pct = variancePct(actual, budget)
  if (Math.abs(v) <= ATTENTION_THRESHOLD.abs) return false
  // Unbudgeted spend above the absolute threshold always needs attention.
  return pct === null || Math.abs(pct) > ATTENTION_THRESHOLD.pct
}

/** Effect of a line's variance on operating result (expenses flip sign). */
export function resultImpact(lineType: LineType, varianceValue: number): number {
  return lineType === "revenue" ? varianceValue : -varianceValue
}
