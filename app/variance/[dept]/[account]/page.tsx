import { Suspense } from "react"
import { notFound } from "next/navigation"
import { DEPARTMENTS, LEDGER, lineId, lineLabel, type DepartmentId } from "@/lib/data"
import { PageContent, PageHeader } from "@/components/shell/page-header"
import { Skeleton } from "@/components/ui/skeleton"
import { VarianceDetail } from "@/components/variance/variance-detail"

export function generateStaticParams() {
  return LEDGER.lines.map((l) => ({ dept: l.deptId ?? "revenue", account: l.accountCode }))
}

type Params = Promise<{ dept: string; account: string }>

export default function VariancePage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<Skeleton className="m-6 h-[900px] rounded-xl" />}>
      <VarianceContent params={params} />
    </Suspense>
  )
}

async function VarianceContent({ params }: { params: Params }) {
  const { dept, account } = await params
  const deptId = dept === "revenue" ? null : (dept as DepartmentId)
  const id = lineId(deptId, account)
  if (!LEDGER.lines.some((l) => l.id === id)) notFound()
  const owner = deptId ? DEPARTMENTS[deptId].name : "Revenue"

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Budget vs Actuals", href: "/" }, { label: owner }, { label: lineLabel(account) }]}
        title={
          <>
            {lineLabel(account)} <span className="font-normal text-muted-foreground">· {owner}</span>
          </>
        }
        description="Variance investigation: check the budget, then trace the actuals to vendors and transactions."
      />
      <PageContent>
        <VarianceDetail lineId={id} />
      </PageContent>
    </>
  )
}
