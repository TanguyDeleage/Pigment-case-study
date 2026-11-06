import { Suspense } from "react"
import { notFound } from "next/navigation"
import { LEDGER, lineId, lineLabel, type DepartmentId } from "@/lib/data"
import { PageContent, PageHeader } from "@/components/shell/page-header"
import { Skeleton } from "@/components/ui/skeleton"
import { VarianceDetail } from "@/components/variance/variance-detail"

export function generateStaticParams() {
  const lines = LEDGER.lines.map((l) => ({ dept: l.deptId ?? "revenue", account: l.accountCode }))
  const accounts = new Set(LEDGER.lines.filter((l) => l.deptId).map((l) => l.accountCode))
  return [...lines, ...[...accounts].map((account) => ({ dept: "all", account }))]
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
  const scope = dept === "revenue" ? null : (dept as DepartmentId | "all")
  const exists =
    scope === "all"
      ? LEDGER.lines.some((l) => l.deptId && l.accountCode === account)
      : LEDGER.lines.some((l) => l.id === lineId(scope, account))
  if (!exists) notFound()

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Budget vs Actuals", href: "/" }, { label: lineLabel(account) }]}
        title={lineLabel(account)}
      />
      <PageContent>
        <VarianceDetail accountCode={account} scope={scope} />
      </PageContent>
    </>
  )
}
