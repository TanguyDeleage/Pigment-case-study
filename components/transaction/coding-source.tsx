import type { CodingSource } from "@/lib/data"

export const CODING_SOURCE_LABEL: Record<CodingSource, string> = {
  vendor_default: "Vendor default",
  po_match: "PO match",
  recurring: "Recurring rule",
  manual: "Manual",
}

/** Vendor default is the weakest signal: nobody looked at this invoice when it was coded. */
export function CodingSourceLabel({ source }: { source: CodingSource }) {
  return (
    <span className={source === "vendor_default" ? "text-foreground underline decoration-dotted underline-offset-4" : "text-muted-foreground"}>
      {CODING_SOURCE_LABEL[source]}
    </span>
  )
}
