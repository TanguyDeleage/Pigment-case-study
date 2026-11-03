import { Suspense } from "react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronRight } from "lucide-react"
import { DEPARTMENTS, LEDGER, lineId, lineLabel, type DepartmentId } from "@/lib/data"
import { PageHeader } from "@/components/shell/page-header"
import { VarianceDetail } from "@/components/variance/variance-detail"

export function generateStaticParams() {
  return LEDGER.lines.map((l) => ({ dept: l.deptId ?? "revenue", account: l.accountCode }))
}

type Params = Promise<{ dept: string; account: string }>

export default function VariancePage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<div className="h-[900px] rounded-md border bg-white" />}>
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
        eyebrow={
          <nav aria-label="Breadcrumb" className="flex items-center gap-1">
            <Link href="/" className="underline-offset-4 hover:underline">
              Budget vs Actuals
            </Link>
            <ChevronRight className="size-3.5" aria-hidden />
            <span>{owner}</span>
            <ChevronRight className="size-3.5" aria-hidden />
            <span>Variance detail</span>
          </nav>
        }
        title={
          <>
            {lineLabel(account)} <span className="font-normal text-neutral-500">· {owner}</span>
          </>
        }
      />
      <VarianceDetail lineId={id} />
    </>
  )
}
