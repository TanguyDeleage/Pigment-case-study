import { TriangleAlert } from "lucide-react"
import type { CodingSource } from "@/lib/data"

export const CODING_SOURCE_LABEL: Record<CodingSource, string> = {
  vendor_default: "Vendor default",
  po_match: "PO match",
  recurring: "Recurring rule",
  manual: "Manual",
}

/** Vendor default is the weakest signal: nobody looked at this invoice when it was coded. */
export function CodingSourceLabel({ source }: { source: CodingSource }) {
  if (source === "vendor_default") {
    return (
      <span className="inline-flex items-center gap-1.5 font-medium text-amber-700">
        <TriangleAlert className="size-3.5 shrink-0" aria-hidden />
        {CODING_SOURCE_LABEL[source]}
      </span>
    )
  }
  return <span className="text-muted-foreground">{CODING_SOURCE_LABEL[source]}</span>
}
