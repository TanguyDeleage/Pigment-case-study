"use client"

import { useState } from "react"
import { MONTHS } from "@/lib/data/calendar"
import type { MonthPoint } from "@/lib/finance/aggregate"
import { formatEur, formatPct } from "@/lib/finance/format"
import { isFavourable, variance, variancePct } from "@/lib/finance/variance"
import { cn } from "@/lib/utils"
import { niceStep } from "./scale"

interface RevenueTrendProps {
  series: MonthPoint[]
  year: number
}

const W = 720
const ML = 44
const MR = 4
const TOP = 28
const PLOT_H = 200
const BOTTOM = 12
const H = TOP + PLOT_H + BOTTOM

const m = (v: number) => formatEur(v, { unit: "M", decimals: 1, symbol: false }).replace(/M$/, "")
const signedM = (v: number) => formatEur(v, { unit: "M", decimals: 1, signed: true, symbol: false }).replace(/M$/, "")

type Pt = [number, number]
const path = (pts: Pt[]) => pts.map(([x, y], i) => `${i ? "L" : "M"}${x},${y}`).join("")

/**
 * Monthly revenue, €M. Actual as a solid line, budget dashed, the gap between them shaded
 * by favourability. The provisional month joins the actual line with a lighter dashed segment.
 * The value axis is truncated so month-to-month movement stays readable.
 */
export function RevenueTrend({ series, year }: RevenueTrendProps) {
  const [hover, setHover] = useState<number | null>(null)
  const col = (W - ML - MR) / series.length
  const base = TOP + PLOT_H

  const values = series.flatMap((p) => (p.actual === null ? [p.budget] : [p.actual, p.budget]))
  const lo = Math.min(...values)
  const hi = Math.max(...values)
  const step = niceStep(Math.max(hi - lo, 1) / 4)
  const dLo = Math.floor(lo / step) * step
  const dHi = Math.ceil(hi / step) * step
  const ticks = Array.from({ length: Math.round((dHi - dLo) / step) + 1 }, (_, i) => dLo + i * step)
  const y = (v: number) => base - ((v - dLo) / (dHi - dLo)) * PLOT_H
  const tickLabel = (t: number) => formatEur(t, { unit: "M", decimals: step >= 1_000_000 ? 0 : 1, symbol: false }).replace(/M$/, "")
  const x = (i: number) => ML + col * (i + 0.5)

  const budgetPts: Pt[] = series.map((p, i) => [x(i), y(p.budget)])
  const closed = series.filter((p) => p.actual !== null && !p.provisional)
  const closedPts: Pt[] = closed.map((p) => [x(p.month), y(p.actual as number)])
  const prov = series.find((p) => p.provisional && p.actual !== null)
  const provPts: Pt[] =
    prov && closedPts.length ? [closedPts[closedPts.length - 1], [x(prov.month), y(prov.actual as number)]] : []

  // Shade AC − BU per segment, splitting where the lines cross so each side gets its own colour.
  const areas: { d: string; fav: boolean }[] = []
  for (let i = 0; i < series.length - 1; i++) {
    const a = series[i]
    const b = series[i + 1]
    if (a.actual === null || b.actual === null) continue
    const d0 = a.actual - a.budget
    const d1 = b.actual - b.budget
    const A0: Pt = [x(i), y(a.actual)]
    const A1: Pt = [x(i + 1), y(b.actual)]
    const B0: Pt = [x(i), y(a.budget)]
    const B1: Pt = [x(i + 1), y(b.budget)]
    if (d0 * d1 >= 0) {
      areas.push({ d: path([A0, A1, B1, B0]) + "Z", fav: isFavourable("revenue", d0 + d1) })
    } else {
      const t = d0 / (d0 - d1)
      const X: Pt = [B0[0] + t * (B1[0] - B0[0]), B0[1] + t * (B1[1] - B0[1])]
      areas.push({ d: path([A0, X, B0]) + "Z", fav: isFavourable("revenue", d0) })
      areas.push({ d: path([X, A1, B1]) + "Z", fav: isFavourable("revenue", d1) })
    }
  }

  const columns = `${ML}fr repeat(${series.length}, ${col}fr) ${MR}fr`

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label={`Monthly revenue, actual versus budget, ${year}`}>
        {hover !== null && <rect x={ML + col * hover} y={0} width={col} height={H} className="fill-muted/70" rx={6} />}

        {ticks.map((t) => (
          <g key={t}>
            <line x1={ML} x2={W - MR} y1={y(t)} y2={y(t)} className="stroke-foreground/8" />
            <text x={ML - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-muted-foreground text-[11px] tabular-nums">
              {tickLabel(t)}
            </text>
          </g>
        ))}

        {areas.map((a, i) => (
          <path key={i} d={a.d} className={a.fav ? "fill-fav-soft" : "fill-unfav-soft"} />
        ))}

        <path d={path(budgetPts)} fill="none" className="stroke-bu" strokeWidth={1.5} strokeDasharray="5 4" />
        {provPts.length > 0 && <path d={path(provPts)} fill="none" className="stroke-ac-prov" strokeWidth={1.5} strokeDasharray="5 4" />}
        <path d={path(closedPts)} fill="none" className="stroke-foreground" strokeWidth={2} />

        {series.map((p, i) => {
          const hasActual = p.actual !== null
          const cy = y(hasActual ? (p.actual as number) : p.budget)
          return (
            <g key={p.month}>
              <circle
                cx={x(i)}
                cy={cy}
                r={3.5}
                className={cn("fill-background", !hasActual ? "stroke-bu" : p.provisional ? "stroke-ac-prov" : "stroke-foreground")}
                strokeWidth={1.75}
              />
              <text
                x={x(i)}
                y={cy - 10}
                textAnchor="middle"
                className={cn("text-[11px] tabular-nums", hasActual ? "fill-foreground font-semibold" : "fill-muted-foreground font-medium")}
              >
                {m(hasActual ? (p.actual as number) : p.budget)}
              </text>
            </g>
          )
        })}

        {series.map((p, i) => (
          <rect
            key={`hit-${p.month}`}
            x={ML + col * i}
            y={0}
            width={col}
            height={H}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          />
        ))}
      </svg>

      <div className="grid items-center" style={{ gridTemplateColumns: columns }}>
        <span />
        {series.map((p) => (
          <span key={p.month} className="pt-3 text-center text-[13px] font-medium text-foreground">
            {MONTHS[p.month]}
          </span>
        ))}
        <span />

        <span className="pt-4 text-xs leading-tight text-foreground">vs budget</span>
        {series.map((p) => {
          if (p.actual === null) {
            return (
              <span key={p.month} className="pt-4 text-center text-xs text-muted-foreground">
                –
              </span>
            )
          }
          const v = variance(p.actual, p.budget)
          return (
            <span key={p.month} className="flex justify-center pt-4">
              <span
                className={cn(
                  "rounded-md px-1.5 py-0.5 text-xs font-semibold tabular-nums",
                  isFavourable("revenue", v) ? "bg-fav-soft text-fav" : "bg-unfav-soft text-unfav",
                )}
              >
                {signedM(v)}
              </span>
            </span>
          )
        })}
        <span />
      </div>

      {hover !== null && (
        <HoverCard point={series[hover]} year={year} left={(x(hover) / W) * 100} flip={hover > series.length / 2} />
      )}
    </div>
  )
}

function HoverCard({ point: p, year, left, flip }: { point: MonthPoint; year: number; left: number; flip: boolean }) {
  const v = p.actual === null ? null : variance(p.actual, p.budget)
  return (
    <div
      className="pointer-events-none absolute top-6 z-10 w-52 rounded-lg border bg-popover p-3 text-xs text-popover-foreground shadow-lg"
      style={{ left: `${left}%`, transform: flip ? "translateX(calc(-100% - 24px))" : "translateX(24px)" }}
    >
      <div className="mb-1.5 font-semibold">
        {MONTHS[p.month]} {year}
        {p.provisional ? " · provisional" : ""}
      </div>
      <div className="flex justify-between">
        <span>AC {p.actual === null ? "–" : formatEur(p.actual, { unit: "M", decimals: 2 })}</span>
        <span>BU {formatEur(p.budget, { unit: "M", decimals: 2 })}</span>
      </div>
      {v !== null && (
        <div className={isFavourable("revenue", v) ? "text-fav" : "text-unfav"}>
          Δ {formatEur(v, { unit: "k", signed: true })} ({formatPct(variancePct(p.actual as number, p.budget))})
        </div>
      )}
    </div>
  )
}

export function RevenueTrendLegend() {
  return (
    <div className="flex items-center gap-4 text-xs whitespace-nowrap text-muted-foreground" aria-label="Legend">
      <span className="flex items-center gap-1.5">
        <span className="inline-block w-4 border-t-2 border-foreground" aria-hidden />Actual
      </span>
      <span className="flex items-center gap-1.5">
        <span className="inline-block w-4 border-t-2 border-dashed border-ac-prov" aria-hidden />Provisional
      </span>
      <span className="flex items-center gap-1.5">
        <span className="inline-block w-4 border-t-2 border-dashed border-bu" aria-hidden />Budget
      </span>
    </div>
  )
}
