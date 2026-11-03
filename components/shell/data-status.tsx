import { DATA_STATE, MONTH_NAMES } from "@/lib/data/calendar"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

/** Dashed outline = provisional, echoing the provisional bar notation in the charts. */
export function DataStatus() {
  const month = MONTH_NAMES[DATA_STATE.monthIndex]
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          tabIndex={0}
          className="flex items-center gap-2 rounded-[4px] border border-dashed border-neutral-500 bg-white px-3 py-1 text-[13px] whitespace-nowrap text-neutral-800"
        >
          <span className="font-semibold text-neutral-950">
            {month} · {DATA_STATE.status}
          </span>
          <span aria-hidden className="text-neutral-400">·</span>
          <span>
            Close day {DATA_STATE.closeDay} of {DATA_STATE.closeDays}
          </span>
          <span aria-hidden className="text-neutral-400">·</span>
          <span>Last sync {DATA_STATE.lastSync}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-72">
        {month} actuals are provisional until accounting closes the month (day {DATA_STATE.closeDays}). Figures can
        still move. Data syncs from the ERP every morning.
      </TooltipContent>
    </Tooltip>
  )
}
