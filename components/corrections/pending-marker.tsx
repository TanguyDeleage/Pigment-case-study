"use client"

import { Clock } from "lucide-react"
import { DEPARTMENTS, PEOPLE } from "@/lib/data"
import { formatEur } from "@/lib/finance/format"
import { pendingForLine, useCorrections } from "@/lib/corrections/store"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

/**
 * Shows that a correction touching this line is awaiting approval.
 * Actuals are unchanged: the dashed outline reads as "provisional", like the charts.
 */
export function PendingMarker({ lineId, className }: { lineId: string; className?: string }) {
  const requests = useCorrections((s) => s.requests)
  const pending = pendingForLine(requests, lineId)
  if (!pending.length) return null
  const total = pending.reduce((s, r) => s + r.amount, 0)
  const first = pending[0]
  const outgoing = `${first.from.deptId}:${first.from.accountCode}` === lineId

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          className={cn(
            "inline-flex h-[22px] items-center gap-1 rounded-full border border-dashed border-neutral-600 bg-white px-2 text-[12px] font-medium whitespace-nowrap text-neutral-900",
            className,
          )}
        >
          <Clock className="size-3" aria-hidden />
          {formatEur(total, { unit: "k" })} correction pending
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-72">
        {first.id}: {formatEur(first.amount, { unit: "k" })} {outgoing ? "moving to" : "moving from"}{" "}
        {DEPARTMENTS[outgoing ? first.to.deptId : first.from.deptId].name}. Waiting for {PEOPLE[first.approverId].name}.
        Actuals stay as booked until approved and posted.
      </TooltipContent>
    </Tooltip>
  )
}
