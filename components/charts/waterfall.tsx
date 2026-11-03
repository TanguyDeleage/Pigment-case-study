"use client"

import { Flag } from "lucide-react"
import type { WaterfallStep } from "@/lib/finance/aggregate"
import { formatK, formatPct } from "@/lib/finance/format"
import { cn } from "@/lib/utils"

interface WaterfallProps {
  steps: WaterfallStep[]
  selectedKey: string | null
  onSelect: (step: WaterfallStep) => void
}

const W = 620
const ML = 4
const MR = 4
const TOP = 52
const PLOT_H = 230
const BOTTOM = 8
const H = TOP + PLOT_H + BOTTOM

const k = (v: number) => formatK(v)
const signedK = (v: number) => formatK(v, { signed: true })

/**
 * Bridge from budgeted to actual operating result, €k.
 * Total bars use a broken axis so the department steps stay readable.
 * Steps are coloured only when they contain lines that need attention.
 */
export function Waterfall({ steps, selectedKey, onSelect }: WaterfallProps) {
  // The Actual column is wider: its label carries the total variance.
  const weights = steps.map((s) => (s.kind === "total-actual" ? 1.35 : 1))
  const unit = (W - ML - MR) / weights.reduce((a, b) => a + b, 0)
  const colX = weights.map((_, i) => ML + weights.slice(0, i).reduce((a, b) => a + b, 0) * unit)
  const bw = unit * 0.56
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
  const dLo = lo - range * 0.36
  const dHi = hi + range * 0.02
  const y = (v: number) => base - ((v - dLo) / (dHi - dLo)) * PLOT_H

  const fillFor = (s: WaterfallStep) => {
    if (s.kind !== "delta") return ""
    if (s.attentionCount === 0) return "fill-neutral-bar"
    return s.value >= 0 ? "fill-fav" : "fill-unfav"
  }

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label="Operating result bridge from budget to actual by department">
        <line x1={ML} x2={W - MR} y1={base} y2={base} className="stroke-foreground/20" />
        {steps.map((s, i) => {
          const cw = weights[i] * unit
          const cx = colX[i] + cw / 2
          const x = cx - bw / 2
          const { from, to } = levels[i]
          const dimmed = selectedKey !== null && selectedKey !== s.key && s.kind === "delta"
          const next = levels[i + 1]
          const connector =
            next !== undefined ? (
              <line
                x1={x + bw}
                x2={colX[i + 1] + (weights[i + 1] * unit - bw) / 2}
                y1={y(to)}
                y2={y(to)}
                className="stroke-foreground/30"
                strokeDasharray="3 3"
              />
            ) : null
          const fav = s.value >= 0

          if (s.kind !== "delta") {
            const top = y(to)
            const breakY = base - 24
            const isActual = s.kind === "total-actual"
            return (
              <g key={s.key}>
                <rect
                  x={x}
                  y={top}
                  width={bw}
                  height={base - top}
                  rx={2}
                  className={isActual ? "fill-ac" : "fill-background stroke-bu"}
                  strokeWidth={isActual ? 0 : 1.4}
                />
                {isActual && (
                  <rect x={x - 3} y={top - 3} width={bw + 6} height={base - top + 3} rx={4} fill="none" className="stroke-ac" strokeDasharray="2 2" />
                )}
                {/* broken-axis marks */}
                <path d={`M${x - 5} ${breakY + 4} L${x + bw + 5} ${breakY - 6}`} className="stroke-card" strokeWidth={6} />
                <path d={`M${x - 5} ${breakY + 1} L${x + bw + 5} ${breakY - 9}`} className="stroke-bu" strokeWidth={1.2} />
                <path d={`M${x - 5} ${breakY + 7} L${x + bw + 5} ${breakY - 3}`} className="stroke-bu" strokeWidth={1.2} />
                <text x={cx} y={top - (isActual ? 24 : 10)} textAnchor="middle" className="fill-foreground text-[14px] font-semibold">
                  {k(s.value)}
                </text>
                {isActual && (
                  <text x={cx} y={top - 9} textAnchor="middle" className="fill-muted-foreground text-[12.5px]">
                    {signedK(s.value - levels[0].to)} · {formatPct(s.pct)} {(s.pct ?? 0) >= 0 ? "Fav" : "Unfav"}
                  </text>
                )}
                {connector}
              </g>
            )
          }

          const yTop = y(Math.max(from, to))
          const yBottom = y(Math.min(from, to))
          const height = Math.max(yBottom - yTop, 3)
          const labelAbove = fav
          const pctText = s.lineType === "revenue" ? `${formatPct(s.pct)} rev.` : `${formatPct(s.pct)} spend`
          return (
            <g
              key={s.key}
              role="button"
              tabIndex={0}
              aria-label={`${s.label}: ${signedK(s.value)}k ${fav ? "favourable" : "unfavourable"}. Filter table.`}
              aria-pressed={selectedKey === s.key}
              onClick={() => onSelect(s)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect(s)}
              className={cn("cursor-pointer outline-none transition-opacity focus-visible:opacity-80", dimmed && "opacity-35")}
            >
              <rect x={colX[i]} y={0} width={cw} height={H} fill="transparent" />
              <rect x={x} y={yTop} width={bw} height={height} rx={2} className={fillFor(s)} />
              {selectedKey === s.key && (
                <rect x={x - 3} y={yTop - 3} width={bw + 6} height={height + 6} rx={4} fill="none" className="stroke-foreground" strokeWidth={1.5} />
              )}
              <text
                x={cx}
                y={labelAbove ? yTop - 22 : yBottom + 16}
                textAnchor="middle"
                className="fill-foreground text-[13px] font-semibold"
              >
                {signedK(s.value)} {fav ? "Fav" : "Unfav"}
              </text>
              <text x={cx} y={labelAbove ? yTop - 8 : yBottom + 30} textAnchor="middle" className="fill-muted-foreground text-[12.5px]">
                {pctText}
              </text>
              {connector}
            </g>
          )
        })}
      </svg>

      <div className="grid" style={{ gridTemplateColumns: weights.map((w) => `${w}fr`).join(" "), paddingInline: `${(ML / W) * 100}%` }}>
        {steps.map((s) => (
          <div key={s.key} className="flex flex-col items-center px-0.5 pt-2 text-center">
            <button
              type="button"
              disabled={s.kind !== "delta"}
              onClick={() => onSelect(s)}
              className={cn(
                "rounded-sm text-[13px] leading-tight outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-default",
                s.kind !== "delta" || s.attentionCount > 0 ? "font-medium text-foreground" : "text-muted-foreground",
              )}
            >
              {s.label}
            </button>
            {s.sublabel && <span className="text-xs text-muted-foreground">{s.sublabel}</span>}
            {s.kind === "delta" && s.attentionCount > 0 && (
              <button
                type="button"
                onClick={() => onSelect(s)}
                className="mt-1.5 flex items-center gap-1 rounded-full bg-unfav-soft px-2 py-0.5 text-[10.5px] font-medium whitespace-nowrap text-unfav hover:bg-unfav-soft/70"
                aria-label={`${s.attentionCount} line${s.attentionCount > 1 ? "s" : ""} ${s.attentionCount > 1 ? "need" : "needs"} attention`}
              >
                <Flag className="size-2.5 shrink-0 fill-current" aria-hidden />
                {s.attentionCount} to review
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export function WaterfallLegend() {
  return (
    <div className="flex shrink-0 items-center gap-3 text-xs whitespace-nowrap text-muted-foreground" aria-label="Legend">
      <span className="flex items-center gap-1.5">
        <span className="inline-block size-2.5 rounded-[3px] bg-fav" aria-hidden />Fav
      </span>
      <span className="flex items-center gap-1.5">
        <span className="inline-block size-2.5 rounded-[3px] bg-unfav" aria-hidden />Unfav
      </span>
    </div>
  )
}
