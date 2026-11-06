import { Suspense } from "react"
import { DashboardView } from "@/components/dashboard/dashboard-view"
import { PageContent, PageHeader } from "@/components/shell/page-header"
import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        crumbs={[{ label: "Finance", href: "/" }, { label: "Budget vs Actuals" }]}
        title="Budget vs Actuals"
      />
      <PageContent>
        {/* TanStack Table reads the clock while rendering, so the interactive view streams in. */}
        <Suspense fallback={<Skeleton className="h-[1200px] rounded-xl" />}>
          <DashboardView />
        </Suspense>
      </PageContent>
    </>
  )
}
