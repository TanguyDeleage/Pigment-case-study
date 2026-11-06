"use client"

import type { ReactNode } from "react"
import { CalendarDays, Network, type LucideIcon } from "lucide-react"
import { DEPARTMENT_ORDER, DEPARTMENTS, MONTH_NAMES, YEAR, type DepartmentId } from "@/lib/data"
import { CURRENT_MONTH } from "@/lib/data/calendar"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select"

const ALL = "all"

interface FilterBarProps {
  month: number
  onMonthChange: (month: number) => void
  costCentre?: DepartmentId | null
  /** Shows the cost-centre filter when provided; without it every cost centre is in scope. */
  onCostCentreChange?: (id: DepartmentId | null) => void
  /** Selectable cost centres; the others are listed but disabled. Defaults to all. */
  costCentres?: DepartmentId[]
  /** Offer an "All" cost-centre option. */
  allowAllCostCentres?: boolean
}

/**
 * Stacks every possible value invisibly in the same grid cell as the current one,
 * so the trigger is always as wide as its longest option and never shifts.
 */
function FilterTrigger({
  icon: Icon,
  label,
  options,
  children,
}: {
  icon: LucideIcon
  label: string
  options: ReactNode[]
  children: ReactNode
}) {
  return (
    <SelectTrigger className="h-9! gap-2 bg-background px-3 shadow-xs">
      <Icon className="text-muted-foreground" aria-hidden />
      <span className="text-muted-foreground">{label}</span>
      <SelectValue>
        <span className="inline-grid">
          {options.map((o, i) => (
            <span key={i} aria-hidden className="invisible col-start-1 row-start-1 flex items-center gap-1.5">
              {o}
            </span>
          ))}
          <span className="col-start-1 row-start-1 flex items-center gap-1.5">{children}</span>
        </span>
      </SelectValue>
    </SelectTrigger>
  )
}

function PeriodLabel({ month }: { month: number }) {
  return (
    <>
      <span className="font-medium">
        {MONTH_NAMES[month]} {YEAR}
      </span>
      <span className="text-muted-foreground">· {month === CURRENT_MONTH ? "Provisional" : "Closed"}</span>
    </>
  )
}

const PERIOD_OPTIONS = Array.from({ length: CURRENT_MONTH + 1 }, (_, i) => <PeriodLabel key={i} month={i} />)
const COST_CENTRE_OPTIONS = ["All", ...DEPARTMENT_ORDER.map((id) => DEPARTMENTS[id].name)].map((n) => (
  <span key={n} className="font-medium">
    {n}
  </span>
))

export function FilterBar({
  month,
  onMonthChange,
  costCentre = null,
  onCostCentreChange,
  costCentres = DEPARTMENT_ORDER,
  allowAllCostCentres = true,
}: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={String(month)} onValueChange={(v) => onMonthChange(Number(v))}>
        <FilterTrigger icon={CalendarDays} label="Period" options={PERIOD_OPTIONS}>
          <PeriodLabel month={month} />
        </FilterTrigger>
        <SelectContent position="popper" align="start" className="w-56">
          <SelectGroup>
            <SelectLabel>{YEAR} · month</SelectLabel>
            {MONTH_NAMES.slice(0, 11).map((name, i) => (
              <SelectItem key={name} value={String(i)} disabled={i > CURRENT_MONTH} className="*:[span]:last:flex-1">
                {name} {YEAR}
                {i > CURRENT_MONTH && <span className="ml-auto text-xs text-muted-foreground">No actuals</span>}
                {i === CURRENT_MONTH && <span className="ml-auto text-xs text-muted-foreground">Provisional</span>}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>

      {onCostCentreChange && (
        <Select value={costCentre ?? ALL} onValueChange={(v) => onCostCentreChange(v === ALL ? null : (v as DepartmentId))}>
          <FilterTrigger icon={Network} label="Cost centre" options={COST_CENTRE_OPTIONS}>
            <span className="font-medium">{costCentre ? DEPARTMENTS[costCentre].name : "All"}</span>
          </FilterTrigger>
          <SelectContent position="popper" align="start" className="w-56">
            {allowAllCostCentres && (
              <>
                <SelectItem value={ALL}>All</SelectItem>
                <SelectSeparator />
              </>
            )}
            <SelectGroup>
              {DEPARTMENT_ORDER.map((id) => (
                <SelectItem key={id} value={id} disabled={!costCentres.includes(id)}>
                  {DEPARTMENTS[id].name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      )}
    </div>
  )
}
