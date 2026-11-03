import { Clock, FilePen } from "lucide-react"
import { STATUS_LABEL, type CorrectionStatus } from "@/lib/corrections/types"
import { Badge } from "@/components/ui/badge"

export function RequestStatusBadge({ status }: { status: CorrectionStatus }) {
  const Icon = status === "draft" ? FilePen : Clock
  return (
    <Badge
      variant="outline"
      className={
        status === "draft"
          ? "text-muted-foreground"
          : "border-dashed border-amber-500/60 bg-amber-50 text-amber-800"
      }
    >
      <Icon aria-hidden />
      {STATUS_LABEL[status]}
    </Badge>
  )
}
