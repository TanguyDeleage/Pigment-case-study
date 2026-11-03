import type { ReactNode } from "react"
import { CorrectionsCounter } from "@/components/corrections/corrections-counter"
import { DataStatus } from "./data-status"

interface PageHeaderProps {
  eyebrow: ReactNode
  title: ReactNode
  children?: ReactNode
}

/** Every view carries the data state (period, close status, sync, pending corrections). */
export function PageHeader({ eyebrow, title, children }: PageHeaderProps) {
  return (
    <header className="mb-5 flex items-start justify-between gap-6">
      <div className="min-w-0">
        <div className="text-[13px] font-medium text-neutral-600">{eyebrow}</div>
        <h1 className="mt-0.5 text-[26px] leading-tight font-semibold tracking-[-0.01em] text-neutral-950">{title}</h1>
        {children}
      </div>
      <div className="flex shrink-0 items-center gap-4 pt-4">
        <DataStatus />
        <CorrectionsCounter />
      </div>
    </header>
  )
}
