"use client"

import { useEffect, useRef, useState } from "react"
import { MONTHS } from "@/lib/data/calendar"
import type { MonthPoint } from "@/lib/finance/aggregate"
import { MINUS, formatEur, formatPct } from "@/lib/finance/format"
import { isFavourable, variance, variancePct, type LineType } from "@/lib/finance/variance"

export interface BarPanel {
  label: string
  lineType: LineType
  series: MonthPoint[]
}

interface MonthlyBarsProps {
  panels: BarPanel[]
  /** Display unit for bar labels: €M with one decimal, or €k whole numbers. */
  unit: "M" | "k"
  panelHeight?: number
  /** Fill the parent's height: panel height is derived from the measured container. */
  fit?: boolean
  ariaLabel: string
  /** Month to highlight; defaults to the provisional month. */
  selectedMonth?: number
}

const W = 620
const ML = 44
const MR = 8
const LABEL_H = 24
const DELTA_H = 28
const PANEL_GAP = 18
const AXIS_H = 28
const TOP = 14

/**
 * IBCS-style column chart: AC solid, BU outlined behind it, provisional AC lighter with
 * a dotted outline. Small multiples share one scale ("same unit, same scale").
 */
export function MonthlyBars({ panels, unit, panelHeight: fixedPanelHeight = 104, fit = false, ariaLabel, selectedMonth }: MonthlyBarsProps) {
  const [hover, setHover] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [fitHeight, setFitHeight] = useState<number | null>(null)

  useEffect(() => {
    if (!fit || !containerRef.current) return
    const el = containerRef.current
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      if (!width || !height) return
      // Convert the container's pixel height into viewBox units, then strip the fixed chrome.
      const vbH = (height * W) / width
      const chrome = TOP + AXIS_H + (panels.length - 1) * PANEL_GAP + panels.length * (LABEL_H + DELTA_H)
      setFitHeight(Math.max(48, (vbH - chrome) / panels.length))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [fit, panels.length])

  const panelHeight = fit ? (fitHeight ?? fixedPanelHeight) : fixedPanelHeight
  const max = Math.max(...panels.flatMap((p) => p.series.flatMap((s) => [s.actual ?? 0, s.budget])))
  const scale = (v: number) => (v / max) * panelHeight
  const cw = (W - ML - MR) / 12
  const bw = cw * 0.4
  const panelBlock = LABEL_H + panelHeight + DELTA_H
  const H = TOP + panels.length * panelBlock + (panels.length - 1) * PANEL_GAP + AXIS_H
  const provisional = panels[0].series.findIndex((p) => p.provisional)
  const selected = selectedMonth ?? provisional

  const div = unit === "M" ? 1_000_000 : 1_000
  const fmt = (v: number) => (unit === "M" ? (v / div).toFixed(1) : Math.round(v / div).toLocaleString("en-GB"))
  const fmtDelta = (v: number) => {
    const r = unit === "M" ? Math.round(v / 100_000) / 10 : Math.round(v / 1000)
    const body = unit === "M" ? Math.abs(r).toFixed(1) : Math.abs(r).toLocaleString("en-GB")
    return `${r > 0 ? "+" : r < 0 ? MINUS : ""}${body}`
  }

  return (
    <div ref={containerRef} className={fit ? "relative h-full" : "relative"}>
      <svg viewBox={`0 0 ${W} ${H}`} className={fit ? "block size-full" : "block w-full"} role="img" aria-label={ariaLabel}>
        {selected >= 0 && (
          <g>
            <rect x={ML + selected * cw + 2} y={0} width={cw - 4} height={H - AXIS_H + 6} className="fill-band" rx={6} />
            <text x={ML + (selected + 0.5) * cw} y={10} textAnchor="middle" className="fill-muted-foreground text-[9.5px] font-semibold tracking-wider">
              {selected === provisional ? "PROV." : "SEL."}
            </text>
          </g>
        )}
        {hover !== null && hover !== selected && (
          <rect x={ML + hover * cw + 2} y={0} width={cw - 4} height={H - AXIS_H + 6} className="fill-muted/70" rx={6} />
        )}

        {panels.map((panel, pi) => {
          const top = TOP + pi * (panelBlock + PANEL_GAP)
          const base = top + LABEL_H + panelHeight
          return (
            <g key={panel.label}>
              <text x={0} y={top + 12} className="fill-foreground text-[13px] font-medium">
                {panel.label}
              </text>
              <line x1={ML - 4} x2={W - MR} y1={base} y2={base} className="stroke-foreground/20" strokeWidth={1} />
              <text x={ML - 12} y={base + 4} textAnchor="end" className="fill-muted-foreground text-[11.5px]">
                0
              </text>
              <text x={ML - 12} y={base + 19} textAnchor="end" className="fill-muted-foreground text-[11.5px]">
                Δ
              </text>
              {panel.series.map((p, i) => {
                const cx = ML + (i + 0.5) * cw
                const buH = scale(p.budget)
                const hasActual = p.actual !== null
                const acH = hasActual ? scale(p.actual as number) : 0
                const labelValue = hasActual ? (p.actual as number) : p.budget
                const labelTop = base - Math.max(acH, buH) - 6
                return (
                  <g key={i}>
                    <rect
                      x={cx - bw / 2 - (hasActual ? 3 : 0)}
                      y={base - buH}
                      width={bw}
                      height={buH}
                      rx={1.5}
                      className="fill-background stroke-bu"
                      strokeWidth={1.2}
                    />
                    {hasActual && (
                      <rect
                        x={cx - bw / 2 + 3}
                        y={base - acH}
                        width={bw}
                        height={acH}
                        rx={1.5}
                        className={p.provisional ? "fill-ac-prov stroke-ac" : "fill-ac"}
                        strokeDasharray={p.provisional ? "2 2" : undefined}
                        strokeWidth={p.provisional ? 1.2 : 0}
                      />
                    )}
                    <text
                      x={cx}
                      y={labelTop}
                      textAnchor="middle"
                      className={`text-[12px] ${hasActual ? "fill-foreground" : "fill-muted-foreground/70"} ${p.provisional ? "font-semibold" : ""}`}
                    >
                      {fmt(labelValue)}
                    </text>
                    {hasActual && (
                      <text
                        x={cx}
                        y={base + 19}
                        textAnchor="middle"
                        className={`fill-muted-foreground text-[12px] ${p.provisional ? "fill-foreground font-semibold" : ""}`}
                      >
                        {fmtDelta(variance(p.actual as number, p.budget))}
                      </text>
                    )}
                  </g>
                )
              })}
            </g>
          )
        })}

        {MONTHS.map((m, i) => (
          <text
            key={m}
            x={ML + (i + 0.5) * cw}
            y={H - 8}
            textAnchor="middle"
            className={`text-[12px] ${i === selected ? "fill-foreground font-semibold" : "fill-muted-foreground"}`}
          >
            {m}
          </text>
        ))}

        {MONTHS.map((m, i) => (
          <rect
            key={`hit-${m}`}
            x={ML + i * cw}
            y={0}
            width={cw}
            height={H}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          />
        ))}
      </svg>

      {hover !== null && (
        <div
          className="pointer-events-none absolute top-6 z-10 w-56 rounded-lg border bg-popover p-3 text-xs text-popover-foreground shadow-lg"
          style={{
            left: `${((ML + (hover + 0.5) * cw) / W) * 100}%`,
            transform: hover > 7 ? "translateX(calc(-100% - 24px))" : "translateX(24px)",
          }}
        >
          <div className="mb-1.5 font-semibold">
            {MONTHS[hover]} 2026{hover === provisional ? " · provisional" : ""}
          </div>
          {panels.map((panel) => {
            const p = panel.series[hover]
            const v = p.actual === null ? null : variance(p.actual, p.budget)
            return (
              <div key={panel.label} className="mb-1 last:mb-0">
                <div className="text-muted-foreground">{panel.label}</div>
                <div className="flex justify-between">
                  <span>AC {p.actual === null ? "–" : formatEur(p.actual, { unit, decimals: unit === "M" ? 2 : 0 })}</span>
                  <span>BU {formatEur(p.budget, { unit, decimals: unit === "M" ? 2 : 0 })}</span>
                </div>
                {v !== null && (
                  <div className={isFavourable(panel.lineType, v) ? "text-fav" : "text-unfav"}>
                    Δ {formatEur(v, { unit: "k", signed: true })} ({formatPct(variancePct(p.actual as number, p.budget))}){" "}
                    {isFavourable(panel.lineType, v) ? "Fav" : "Unfav"}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function ChartLegend() {
  return (
    <div className="flex shrink-0 items-center gap-3 text-xs whitespace-nowrap text-muted-foreground" aria-label="Legend">
      <span className="flex items-center gap-1.5">
        <span className="inline-block size-2.5 rounded-[3px] bg-ac" aria-hidden /> AC
      </span>
      <span className="flex items-center gap-1.5">
        <span className="inline-block size-2.5 rounded-[3px] border border-bu bg-background" aria-hidden /> BU
      </span>
      <span className="flex items-center gap-1.5">
        <span className="inline-block size-2.5 rounded-[3px] border border-dashed border-ac bg-ac-prov" aria-hidden /> Provisional
      </span>
    </div>
  )
}
