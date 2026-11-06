"use client"

import * as React from "react"
import { cn } from "cn"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

/** Ellipsis-truncated text that reveals its full content in a tooltip — only when it's actually cut off. */
function TruncatedText({ className, children, ...props }: React.ComponentProps<"span">) {
  const ref = React.useRef<HTMLSpanElement>(null)
  const [open, setOpen] = React.useState(false)

  const onOpenChange = (next: boolean) => {
    const el = ref.current
    setOpen(next && !!el && el.scrollWidth > el.clientWidth)
  }

  return (
    <Tooltip open={open} onOpenChange={onOpenChange}>
      <TooltipTrigger asChild>
        <span ref={ref} className={cn("min-w-0 truncate", className)} {...props}>
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent>{children}</TooltipContent>
    </Tooltip>
  )
}

export { TruncatedText }
