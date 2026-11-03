"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { DEPARTMENTS, PEOPLE } from "@/lib/data"
import { formatEur } from "@/lib/finance/format"
import { useCorrections } from "@/lib/corrections/store"
import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { RequestStatusBadge } from "./request-status-badge"

export function CorrectionsCounter() {
  const requests = useCorrections((s) => s.requests)
  const pending = requests.filter((r) => r.status === "pending_approval").length

  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          "rounded-sm text-[14px] whitespace-nowrap underline underline-offset-4 outline-none hover:text-neutral-950 focus-visible:ring-2 focus-visible:ring-ring/50",
          pending ? "font-semibold text-neutral-950" : "text-neutral-800",
        )}
      >
        {pending} correction{pending === 1 ? "" : "s"} pending
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[400px] p-0">
        <div className="border-b px-4 py-3">
          <div className="text-sm font-semibold">Your correction requests</div>
          <div className="text-xs text-neutral-500">Actuals change only after approval and posting in the ERP.</div>
        </div>
        {requests.length === 0 ? (
          <p className="px-4 py-6 text-sm text-neutral-500">
            No corrections yet. Open a transaction from a variance line to request a reclassification.
          </p>
        ) : (
          <ul className="divide-y">
            {requests.map((r) => (
              <li key={r.id} className="px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-neutral-500">{r.id}</span>
                  <RequestStatusBadge status={r.status} />
                </div>
                <div className="mt-1 text-sm font-semibold">
                  {formatEur(r.amount, { unit: "k" })} · {r.vendor}
                </div>
                <div className="mt-0.5 flex items-center gap-1.5 text-sm text-neutral-700">
                  {DEPARTMENTS[r.from.deptId].name} <ArrowRight className="size-3.5" aria-label="to" />{" "}
                  {DEPARTMENTS[r.to.deptId].name} · {r.to.accountCode}
                </div>
                <div className="mt-1 flex items-center justify-between text-xs text-neutral-500">
                  <span>
                    {r.status === "draft" ? "Not sent yet" : `Waiting for ${PEOPLE[r.approverId].name}`}
                  </span>
                  <Link
                    href={`/variance/${r.from.deptId}/${r.from.accountCode}?tab=transactions&tx=${r.transactionId}`}
                    className="font-medium text-neutral-900 underline underline-offset-2"
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
