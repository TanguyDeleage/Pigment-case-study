"use client"

import Link from "next/link"
import { ArrowRight, Inbox } from "lucide-react"
import { DEPARTMENTS, PEOPLE } from "@/lib/data"
import { formatEur } from "@/lib/finance/format"
import { useCorrections } from "@/lib/corrections/store"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { RequestStatusBadge } from "./request-status-badge"

export function CorrectionsCounter() {
  const requests = useCorrections((s) => s.requests)
  const pending = requests.filter((r) => r.status === "pending_approval").length

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs">
          <Inbox aria-hidden />
          Corrections
          <span
            className={cn(
              "flex h-4.5 min-w-4.5 items-center justify-center rounded-full px-1 text-[11px] font-semibold tabular-nums",
              pending ? "bg-brand text-white" : "bg-muted text-muted-foreground",
            )}
            aria-label={`${pending} pending`}
          >
            {pending}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[400px] overflow-hidden p-0">
        <div className="border-b bg-muted/40 px-4 py-3">
          <div className="text-sm font-semibold">Your correction requests</div>
          <div className="text-xs text-muted-foreground">Actuals change only after approval and posting in the ERP.</div>
        </div>
        {requests.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            No corrections yet. Open a transaction from a variance line to request a reclassification.
          </p>
        ) : (
          <ul className="divide-y">
            {requests.map((r) => (
              <li key={r.id} className="px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs text-muted-foreground">{r.id}</span>
                  <RequestStatusBadge status={r.status} />
                </div>
                <div className="mt-1 text-sm font-semibold">
                  {formatEur(r.amount, { unit: "k" })} · {r.vendor}
                </div>
                <div className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                  {DEPARTMENTS[r.from.deptId].name} <ArrowRight className="size-3.5" aria-label="to" />{" "}
                  {DEPARTMENTS[r.to.deptId].name} · {r.to.accountCode}
                </div>
                <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {r.status === "draft" ? "Not sent yet" : `Waiting for ${PEOPLE[r.approverId].name}`}
                  </span>
                  <Link
                    href={`/variance/${r.from.deptId}/${r.from.accountCode}?tab=transactions&tx=${r.transactionId}`}
                    className="font-medium text-foreground hover:underline hover:underline-offset-4"
                  >
                    Open transaction
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  )
}
