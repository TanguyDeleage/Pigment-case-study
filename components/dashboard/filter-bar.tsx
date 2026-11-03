"use client"

import type { ReactNode } from "react"
import { CalendarDays, Globe, Info, Network, type LucideIcon } from "lucide-react"
import { DEPARTMENT_ORDER, DEPARTMENTS, MONTH_NAMES, YEAR, type DepartmentId } from "@/lib/data"
import { CURRENT_MONTH } from "@/lib/data/calendar"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

const ALL = "all"

const COUNTRIES = [
  { code: "FR", name: "France" },
  { code: "GB", name: "United Kingdom" },
]

interface FilterBarProps {
  month: number
  onMonthChange: (month: number) => void
  costCentre: DepartmentId | null
  onCostCentreChange: (id: DepartmentId | null) => void
}

function FilterTrigger({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: ReactNode }) {
  return (
    <SelectTrigger className="h-9! gap-2 bg-background px-3 shadow-xs">
      <Icon className="text-muted-foreground" aria-hidden />
      <span className="text-muted-foreground">{label}</span>
      <SelectValue>{children}</SelectValue>
    </SelectTrigger>
  )
}

export function FilterBar({ month, onMonthChange, costCentre, onCostCentreChange }: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={String(month)} onValueChange={(v) => onMonthChange(Number(v))}>
        <FilterTrigger icon={CalendarDays} label="Period">
          <span className="font-medium">
            {MONTH_NAMES[month]} {YEAR}
          </span>
          <span className="text-muted-foreground">· {month === CURRENT_MONTH ? "Provisional" : "Closed"}</span>
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

      <Select value={ALL}>
        <FilterTrigger icon={Globe} label="Country">
          <span className="font-medium">All countries</span>
        </FilterTrigger>
        <SelectContent position="popper" align="start" className="w-56">
          <SelectItem value={ALL}>All countries</SelectItem>
          <SelectSeparator />
          <SelectGroup>
            {COUNTRIES.map((c) => (
              <SelectItem key={c.code} value={c.code} disabled>
                {c.name}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>

      <Select value={costCentre ?? ALL} onValueChange={(v) => onCostCentreChange(v === ALL ? null : (v as DepartmentId))}>
        <FilterTrigger icon={Network} label="Cost centre">
          <span className="font-medium">{costCentre ? DEPARTMENTS[costCentre].name : "All"}</span>
        </FilterTrigger>
        <SelectContent position="popper" align="start" className="w-56">
          <SelectItem value={ALL}>All</SelectItem>
          <SelectSeparator />
          <SelectGroup>
            {DEPARTMENT_ORDER.map((id) => (
              <SelectItem key={id} value={id}>
                {DEPARTMENTS[id].name}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>

      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0} className="ml-auto flex items-center gap-1.5 rounded-md text-xs text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
            <Info className="size-3.5" aria-hidden />
            AC = Actual · BU = Budget · Var = AC − BU
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-64">
          Notation follows IBCS: solid bars are actuals, outlined bars are budget, dashed means provisional.
        </TooltipContent>
      </Tooltip>
    </div>
  )
}
