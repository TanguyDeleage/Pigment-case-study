"use client"

import { useState, type ReactNode } from "react"
import { Check, ChevronDown } from "lucide-react"
import { DEPARTMENT_ORDER, DEPARTMENTS, MONTHS, YEAR, type DepartmentId } from "@/lib/data"
import { CURRENT_MONTH } from "@/lib/data/calendar"
import { cn } from "@/lib/utils"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface FilterBarProps {
  costCentre: DepartmentId | null
  onCostCentreChange: (id: DepartmentId | null) => void
}

function Chip({ label, value, suffix, children }: { label: string; value: string; suffix?: string; children: (close: () => void) => ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="flex h-9 items-center gap-1.5 rounded-full border border-neutral-400 bg-white px-4 text-[14px] text-neutral-700 outline-none hover:border-neutral-600 focus-visible:ring-2 focus-visible:ring-ring/50 aria-expanded:border-neutral-800">
        {label} <span className="font-semibold text-neutral-950">{value}</span>
        {suffix && <span className="text-neutral-600">· {suffix}</span>}
        <ChevronDown className="ml-1 size-4 text-neutral-700" aria-hidden />
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
      {selected ? <Check className="size-4" aria-hidden /> : hint ? <span className="text-xs text-neutral-400">{hint}</span> : null}
    </CommandItem>
  )
}

export function FilterBar({ costCentre, onCostCentreChange }: FilterBarProps) {
  return (
    <div className="mb-5 flex flex-wrap items-center gap-3">
      <Chip label="Period" value={`October ${YEAR}`} suffix="Month">
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
            <p className="border-t px-3 py-2 text-xs text-neutral-500">Prototype covers October only.</p>
          </Command>
        )}
      </Chip>

      <Chip label="Entity" value="All entities">
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

      <Chip label="Cost centre" value={costCentre ? DEPARTMENTS[costCentre].name : "All"}>
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

      <span className="ml-2 text-[14px] text-neutral-700">AC = Actual · BU = Budget · Variance = AC − BU</span>
    </div>
  )
}
