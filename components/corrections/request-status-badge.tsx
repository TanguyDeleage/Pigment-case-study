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
          ? "border-neutral-300 bg-white text-neutral-600"
          : "border-dashed border-neutral-600 bg-white text-neutral-900"
      }
    >
      <Icon aria-hidden />
      {STATUS_LABEL[status]}
    </Badge>
  )
}
