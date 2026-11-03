"use client"

import { useState, type ReactNode } from "react"
import { Building2, CalendarDays, Check, ChevronDown, Info, Network, type LucideIcon } from "lucide-react"
import { DEPARTMENT_ORDER, DEPARTMENTS, MONTHS, YEAR, type DepartmentId } from "@/lib/data"
import { CURRENT_MONTH } from "@/lib/data/calendar"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

interface FilterBarProps {
  costCentre: DepartmentId | null
  onCostCentreChange: (id: DepartmentId | null) => void
}

function Chip({
  icon: Icon,
  label,
  value,
  suffix,
  children,
}: {
  icon: LucideIcon
  label: string
  value: string
  suffix?: string
  children: (close: () => void) => ReactNode
}) {
  const [open, setOpen] = useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-9 gap-2 bg-background px-3 font-normal shadow-xs aria-expanded:bg-muted">
          <Icon className="text-muted-foreground" aria-hidden />
          <span className="text-muted-foreground">{label}</span>
          <span className="font-medium">{value}</span>
          {suffix && <span className="text-muted-foreground">· {suffix}</span>}
          <ChevronDown className="text-muted-foreground" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-0">
        {children(() => setOpen(false))}
      </PopoverContent>
    </Popover>
  )
}

function Option({ selected, disabled, hint, children, onSelect }: { selected?: boolean; disabled?: boolean; hint?: string; children: ReactNode; onSelect?: () => void }) {
  return (
    <CommandItem disabled={disabled} onSelect={onSelect} className="justify-between">
      <span className={cn(selected && "font-semibold")}>{children}</span>
      {selected ? <Check className="size-4" aria-hidden /> : hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
    </CommandItem>
  )
}

export function FilterBar({ costCentre, onCostCentreChange }: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Chip icon={CalendarDays} label="Period" value={`October ${YEAR}`} suffix="Month">
        {() => (
          <Command>
            <CommandList>
              <CommandGroup heading={`${YEAR} · month`}>
                {MONTHS.map((m, i) => (
                  <Option key={m} selected={i === CURRENT_MONTH} disabled={i !== CURRENT_MONTH} hint={i > CURRENT_MONTH ? "No actuals" : "Closed"}>
                    {m} {YEAR}
                  </Option>
                ))}
              </CommandGroup>
            </CommandList>
            <p className="border-t px-3 py-2 text-xs text-muted-foreground">Prototype covers October only.</p>
          </Command>
        )}
      </Chip>

      <Chip icon={Building2} label="Entity" value="All entities">
        {() => (
          <Command>
            <CommandList>
              <CommandGroup>
                <Option selected>All entities</Option>
                <Option disabled hint="Prototype">Canvas Labs SAS (FR)</Option>
                <Option disabled hint="Prototype">Canvas Labs Ltd (UK)</Option>
              </CommandGroup>
            </CommandList>
          </Command>
        )}
      </Chip>

      <Chip icon={Network} label="Cost centre" value={costCentre ? DEPARTMENTS[costCentre].name : "All"}>
        {(close) => (
          <Command>
            <CommandInput placeholder="Search cost centre" />
            <CommandList>
              <CommandEmpty>No cost centre found.</CommandEmpty>
              <CommandGroup>
                <Option
                  selected={costCentre === null}
                  onSelect={() => {
                    onCostCentreChange(null)
                    close()
                  }}
                >
                  All
                </Option>
                {DEPARTMENT_ORDER.map((id) => (
                  <Option
                    key={id}
                    selected={costCentre === id}
                    onSelect={() => {
                      onCostCentreChange(id)
                      close()
                    }}
                  >
                    {DEPARTMENTS[id].name}
                  </Option>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        )}
      </Chip>

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
