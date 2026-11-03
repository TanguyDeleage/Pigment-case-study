"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { FileText, LayoutGrid, PencilLine, Settings, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

interface Item {
  label: string
  icon: LucideIcon
  href?: string
  match?: (path: string) => boolean
}

const ITEMS: Item[] = [
  { label: "Budget vs Actuals", icon: LayoutGrid, href: "/", match: (p) => p === "/" || p.startsWith("/variance") },
  { label: "Corrections (not in prototype)", icon: PencilLine },
  { label: "Reports (not in prototype)", icon: FileText },
  { label: "Settings (not in prototype)", icon: Settings },
]

export function AppRail() {
  const pathname = usePathname()
  return (
    <nav
      aria-label="Main"
      className="sticky top-0 flex h-screen w-14 shrink-0 flex-col items-center gap-2 border-r bg-[#f0f0ef] py-3"
    >
      <Link
        href="/"
        aria-label="Canvas Labs home"
        className="mb-3 flex size-9 items-center justify-center rounded-md bg-[#2b2b2b] text-xs font-semibold text-white"
      >
        CL
      </Link>
      {ITEMS.map((item) => {
        const active = item.match?.(pathname) ?? false
        const className = cn(
          "flex size-10 items-center justify-center rounded-md text-neutral-500 transition-colors",
          active ? "bg-[#e3e3e2] text-neutral-900" : item.href ? "hover:bg-[#e7e7e6]" : "cursor-default opacity-70",
        )
        const icon = <item.icon className="size-[18px]" strokeWidth={1.75} />
        return (
          <Tooltip key={item.label}>
            <TooltipTrigger asChild>
              {item.href ? (
                <Link href={item.href} aria-label={item.label} aria-current={active ? "page" : undefined} className={className}>
                  {icon}
                </Link>
              ) : (
                <span role="img" aria-label={item.label} className={className}>
                  {icon}
                </span>
              )}
            </TooltipTrigger>
            <TooltipContent side="right">{item.label}</TooltipContent>
          </Tooltip>
        )
      })}
    </nav>
  )
}
