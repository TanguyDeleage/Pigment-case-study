import { Suspense } from "react"
import { DashboardView } from "@/components/dashboard/dashboard-view"
import { PageHeader } from "@/components/shell/page-header"

export default function DashboardPage() {
  return (
    <>
      <PageHeader eyebrow="Canvas Labs · Finance" title="Budget vs Actuals" />
      {/* TanStack Table reads the clock while rendering, so the interactive view streams in. */}
      <Suspense fallback={<div className="h-[1200px] rounded-md border bg-white" />}>
        <DashboardView />
      </Suspense>
    </>
  )
}
