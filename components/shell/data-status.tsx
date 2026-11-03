import { RefreshCw } from "lucide-react"
import { DATA_STATE, MONTH_NAMES } from "@/lib/data/calendar"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

/** Dashed outline = provisional, echoing the provisional bar notation in the charts. */
export function DataStatus() {
  const month = MONTH_NAMES[DATA_STATE.monthIndex]
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge tabIndex={0} variant="outline" className="h-7 gap-2 border-dashed px-2.5 text-xs font-normal text-muted-foreground">
          <span className="relative flex size-2" aria-hidden>
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-amber-400 opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-amber-500" />
          </span>
          <span className="font-medium text-foreground">
            {month} · {DATA_STATE.status}
          </span>
          <span className="flex items-center gap-1" aria-label={`Close day ${DATA_STATE.closeDay} of ${DATA_STATE.closeDays}`}>
            {Array.from({ length: DATA_STATE.closeDays }, (_, i) => (
              <span key={i} className={`h-1.5 w-2.5 rounded-full ${i < DATA_STATE.closeDay ? "bg-amber-500" : "bg-border"}`} />
            ))}
          </span>
          <span className="flex items-center gap-1">
            <RefreshCw className="size-3" aria-hidden /> {DATA_STATE.lastSync}
          </span>
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-72">
        Close day {DATA_STATE.closeDay} of {DATA_STATE.closeDays}. {month} actuals are provisional until accounting closes the
        month. Figures can still move. Data syncs from the ERP every morning (last sync {DATA_STATE.lastSync}).
      </TooltipContent>
    </Tooltip>
  )
}
