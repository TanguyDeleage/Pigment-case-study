import type { WaterfallStep } from "@/lib/finance/aggregate"
import { formatK } from "@/lib/finance/format"
import { cn } from "@/lib/utils"
import { niceStep } from "./scale"

interface WaterfallProps {
  steps: WaterfallStep[]
}

const W = 720
const ML = 60
const MR = 4
const TOP = 36
const PLOT_H = 240
const BOTTOM = 8
const H = TOP + PLOT_H + BOTTOM

const k = (v: number) => formatK(v)
const signedK = (v: number) => formatK(v, { signed: true })

/**
 * Bridge from budgeted to actual opex, €k. Read-only.
 * Delta values are spend variances: positive = overspend.
 * The value axis is truncated (not zero-based) so department steps stay readable,
 * with enough room below the bridge for the totals to dominate.
 */
export function Waterfall({ steps }: WaterfallProps) {
  const col = (W - ML - MR) / steps.length
  const bw = col * 0.56
  const base = TOP + PLOT_H

  const levels: { from: number; to: number }[] = []
  let running = 0
  for (const s of steps) {
    if (s.kind === "delta") {
      levels.push({ from: running, to: running + s.value })
      running += s.value
    } else {
      levels.push({ from: 0, to: s.value })
      running = s.value
    }
  }
  const tops = levels.flatMap((l, i) => (steps[i].kind === "delta" ? [l.from, l.to] : [l.to]))
  const lo = Math.min(...tops)
  const hi = Math.max(...tops)
  const range = Math.max(hi - lo, 1)
  // Leave twice the bridge's range below it, so the totals read clearly taller than any step.
  const step = niceStep((range * 3) / 4)
  const dLo = Math.floor((lo - range * 2) / step) * step
  const dHi = Math.ceil(hi / step) * step
  const ticks = Array.from({ length: Math.round((dHi - dLo) / step) + 1 }, (_, i) => dLo + i * step)
  const y = (v: number) => base - ((v - dLo) / (dHi - dLo)) * PLOT_H

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full overflow-visible" role="img" aria-label="Opex bridge from budget to actual by cost centre">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={ML} x2={W - MR} y1={y(t)} y2={y(t)} className={t === dLo ? "stroke-foreground/30" : "stroke-foreground/8"} />
            <text x={ML - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-muted-foreground text-[11px] tabular-nums">
              {k(t)}
            </text>
          </g>
        ))}
        {steps.map((s, i) => {
          const cx = ML + col * (i + 0.5)
          const x = cx - bw / 2
          const { from, to } = levels[i]
          const next = levels[i + 1]
          const connector =
            next !== undefined ? (
              <line x1={x + bw} x2={x + col} y1={y(to)} y2={y(to)} className="stroke-foreground/35" strokeDasharray="3 3" />
            ) : null

          if (s.kind !== "delta") {
            const top = y(to)
            const isActual = s.kind === "total-actual"
            return (
              <g key={s.key}>
                <rect
                  x={x}
                  y={top}
                  width={bw}
                  height={base - top}
                  rx={3}
                  className={isActual ? "fill-foreground" : "fill-muted stroke-foreground/70"}
                  strokeWidth={isActual ? 0 : 1}
                />
                <text
                  x={cx}
                  y={top + 16}
                  textAnchor="middle"
                  className={cn("text-[11px] font-semibold tabular-nums", isActual ? "fill-background" : "fill-foreground")}
                >
                  {k(s.value)}
                </text>
                {connector}
              </g>
            )
          }

          const yTop = y(Math.max(from, to))
          const height = Math.max(y(Math.min(from, to)) - yTop, 3)
          const overspend = s.value > 0
          // The value sits inside the bar, in white, when the bar is tall enough to hold it.
          const inside = height >= 18
          return (
            <g key={s.key}>
              <rect x={x} y={yTop} width={bw} height={height} rx={3} className={overspend ? "fill-unfav" : "fill-fav"} />
              <text
                x={cx}
                y={inside ? yTop + height / 2 : yTop - 10}
                dy={inside ? "0.35em" : undefined}
                textAnchor="middle"
                className={cn("text-[11px] font-semibold tabular-nums", inside ? "fill-white" : overspend ? "fill-unfav" : "fill-fav")}
              >
                {signedK(s.value)}
              </text>
              {connector}
            </g>
          )
        })}
      </svg>

      <div className="grid" style={{ gridTemplateColumns: `repeat(${steps.length}, 1fr)`, paddingLeft: `${(ML / W) * 100}%`, paddingRight: `${(MR / W) * 100}%` }}>
        {steps.map((s) => (
          <div key={s.key} className="flex flex-col items-center px-0.5 pt-3 text-center">
            <span className={cn("text-[13px] leading-tight text-foreground", s.kind === "delta" ? "font-medium" : "font-semibold")}>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function WaterfallLegend() {
  return (
    <div className="flex items-center gap-4 text-xs whitespace-nowrap text-muted-foreground" aria-label="Legend">
      <span className="flex items-center gap-1.5">
        <span className="inline-block size-2.5 rounded-[3px] bg-fav" aria-hidden />Underspend
      </span>
      <span className="flex items-center gap-1.5">
        <span className="inline-block size-2.5 rounded-[3px] bg-unfav" aria-hidden />Overspend
      </span>
    </div>
  )
}
