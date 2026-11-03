/** Round a raw tick step up to 1, 2, 2.5 or 5 × 10ⁿ. */
export function niceStep(raw: number) {
  const mag = 10 ** Math.floor(Math.log10(raw))
  const f = raw / mag
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * mag
}
