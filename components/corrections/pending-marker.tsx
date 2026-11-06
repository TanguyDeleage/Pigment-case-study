"use client"

import { Clock } from "lucide-react"
import { DEPARTMENTS, PEOPLE } from "@/lib/data"
import { formatEur } from "@/lib/finance/format"
import { pendingForLine, useCorrections } from "@/lib/corrections/store"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

/**
 * A quiet clock icon showing that an edit touching this line is awaiting approval.
 * Details live in the tooltip so the row stays readable; actuals are unchanged until approved.
 */
export function PendingMarker({ lineId, className }: { lineId: string; className?: string }) {
  const requests = useCorrections((s) => s.requests)
  const pending = pendingForLine(requests, lineId)
  if (!pending.length) return null
  const first = pending[0]
  const outgoing = `${first.from.deptId}:${first.from.accountCode}` === lineId
  const label = pending.length > 1 ? `${pending.length} edits requested` : "Edit requested"

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          role="img"
          aria-label={`${label}, pending approval`}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "inline-flex size-5 shrink-0 items-center justify-center rounded-md text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50",
            className,
          )}
        >
          <Clock className="size-3.5" aria-hidden />
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-72">
        <div className="font-medium">{label} · pending approval</div>
        <div className="mt-0.5 opacity-80">
          {pending.length > 1
            ? `${formatEur(pending.reduce((s, r) => s + r.amount, 0), { unit: "k" })} in total. `
            : `${first.vendor}, ${formatEur(first.amount, { unit: "k" })} ${outgoing ? "moving to" : "moving from"} ${
                DEPARTMENTS[outgoing ? first.to.deptId : first.from.deptId].name
              }. `}
          Waiting for {PEOPLE[first.approverId].name}. Actuals stay as booked until approved.
        </div>
      </TooltipContent>
    </Tooltip>
  )
}
