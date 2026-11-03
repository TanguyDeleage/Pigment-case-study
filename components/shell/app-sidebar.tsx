"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  ChartColumnBig,
  ChevronsUpDown,
  FileText,
  LogOut,
  PencilLine,
  Settings,
  Target,
  UserRound,
  type LucideIcon,
} from "lucide-react"
import { CURRENT_USER, PEOPLE } from "@/lib/data"
import { useCorrections } from "@/lib/corrections/store"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

interface Item {
  label: string
  icon: LucideIcon
  href?: string
  match?: (path: string) => boolean
}

const ANALYSIS: Item[] = [
  { label: "Budget vs Actuals", icon: ChartColumnBig, href: "/", match: (p) => p === "/" || p.startsWith("/variance") },
  { label: "Forecast", icon: Target },
  { label: "Reports", icon: FileText },
]

function NavItem({ item, pathname, badge }: { item: Item; pathname: string; badge?: number }) {
  const active = item.match?.(pathname) ?? false
  const content = (
    <>
      <item.icon />
      <span>{item.label}</span>
    </>
  )
  return (
    <SidebarMenuItem>
      {item.href ? (
        <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
          <Link href={item.href} aria-current={active ? "page" : undefined}>
            {content}
          </Link>
        </SidebarMenuButton>
      ) : (
        <SidebarMenuButton tooltip={`${item.label} (not in prototype)`} className="text-sidebar-foreground/60 hover:bg-transparent">
          {content}
        </SidebarMenuButton>
      )}
      {badge ? <SidebarMenuBadge className="rounded-full bg-brand-soft text-brand">{badge}</SidebarMenuBadge> : null}
    </SidebarMenuItem>
  )
}

export function AppSidebar() {
  const pathname = usePathname()
  const pending = useCorrections((s) => s.requests.filter((r) => r.status === "pending_approval").length)
  const me = PEOPLE[CURRENT_USER]

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <span className="flex aspect-square size-8 items-center justify-center rounded-lg bg-linear-to-br from-brand to-[oklch(0.45_0.2_280)] text-[12px] font-semibold text-white shadow-sm">
                  CL
                </span>
                <span className="grid flex-1 text-left leading-tight">
                  <span className="truncate text-sm font-semibold">Canvas Labs</span>
                  <span className="truncate text-xs text-muted-foreground">Finance workspace</span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Performance</SidebarGroupLabel>
          <SidebarMenu>
            {ANALYSIS.map((item) => (
              <NavItem key={item.label} item={item} pathname={pathname} />
            ))}
          </SidebarMenu>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Workflow</SidebarGroupLabel>
          <SidebarMenu>
            <NavItem item={{ label: "Corrections", icon: PencilLine }} pathname={pathname} badge={pending} />
            <NavItem item={{ label: "Settings", icon: Settings }} pathname={pathname} />
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent">
                  <Avatar className="size-8 rounded-lg">
                    <AvatarFallback className="rounded-lg bg-brand-soft text-[12px] font-semibold text-brand">{me.initials}</AvatarFallback>
                  </Avatar>
                  <span className="grid flex-1 text-left leading-tight">
                    <span className="truncate text-sm font-medium">{me.name}</span>
                    <span className="truncate text-xs text-muted-foreground">{me.role}</span>
                  </span>
                  <ChevronsUpDown className="ml-auto" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" align="end" sideOffset={8} className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="text-sm font-medium">{me.name}</div>
                  <div className="text-xs text-muted-foreground">{me.role} · Canvas Labs</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem disabled>
                    <UserRound /> Profile
                    <Badge variant="secondary" className="ml-auto">
                      Soon
                    </Badge>
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled>
                    <LogOut /> Log out
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
