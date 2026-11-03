"use client"

import { useState, type ReactNode } from "react"
import { ArrowRight, Check, Clock, Info, Sparkles } from "lucide-react"
import { DEPARTMENTS, LEDGER, PEOPLE, PURCHASE_ORDERS, VENDOR_DEFAULTS, lineLabel, type Transaction } from "@/lib/data"
import { findLine } from "@/lib/finance/aggregate"
import { formatEurExact } from "@/lib/finance/format"
import { requestForTransaction, useCorrections } from "@/lib/corrections/store"
import { RequestStatusBadge } from "@/components/corrections/request-status-badge"
import { ReclassDialog } from "@/components/corrections/reclass-dialog"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { CODING_SOURCE_LABEL } from "./coding-source"
import { CommentsThread } from "./comments-thread"
import { InvoicePreview } from "./invoice-preview"

const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" })

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-[12px] font-semibold tracking-wide text-neutral-500 uppercase">{title}</h3>
      {children}
    </section>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1 text-[13.5px]">
      <span className="text-neutral-600">{label}</span>
      <span className="text-right font-medium text-neutral-950">{children}</span>
    </div>
  )
}

export function TransactionSheet({ transaction, onClose }: { transaction: Transaction | null; onClose: () => void }) {
  return (
    <Sheet open={transaction !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="gap-0 overflow-y-auto data-[side=right]:w-[600px] data-[side=right]:sm:max-w-[600px]">
        {transaction && <TransactionPanel key={transaction.id} transaction={transaction} />}
      </SheetContent>
    </Sheet>
  )
}

function TransactionPanel({ transaction: t }: { transaction: Transaction }) {
  const [reclassOpen, setReclassOpen] = useState(false)
  const requests = useCorrections((s) => s.requests)
  const request = requestForTransaction(requests, t.id)
  const pending = request?.status === "pending_approval"

  const { deptId, accountCode } = findLine(LEDGER, t.lineId)!
  const vendorDefault = VENDOR_DEFAULTS.find((v) => v.vendor === t.vendor)
  const po = PURCHASE_ORDERS.find(
    (p) => p.vendor === t.vendor && p.amount === t.amount && (p.deptId !== deptId || p.accountCode !== accountCode),
  )
  const currentCoding = `${deptId ? DEPARTMENTS[deptId].name : "Revenue"} · ${lineLabel(accountCode)}`

  return (
    <>
      <SheetHeader className="border-b px-6 pt-6 pb-4">
        <div className="text-[12px] text-neutral-500">
          {t.id} · posted {dateFmt.format(new Date(t.postingDate))} · provisional
        </div>
        <SheetTitle className="text-[20px]">{t.vendor}</SheetTitle>
        <SheetDescription className="text-[13.5px] text-neutral-700">{t.description}</SheetDescription>
        <div className="mt-1 text-[28px] font-semibold tracking-tight text-neutral-950">{formatEurExact(t.amount)}</div>
      </SheetHeader>

      <div className="space-y-6 px-6 py-5">
        {request && (
          <div className="rounded-md border border-dashed border-neutral-600 bg-neutral-50 px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-[14px] font-semibold">
                <Clock className="size-4" aria-hidden />
                {pending ? "Correction pending approval" : "Draft correction saved"}
              </span>
              <RequestStatusBadge status={request.status} />
            </div>
            <p className="mt-1 text-[13px] text-neutral-700">
              {request.id} · {formatEurExact(request.amount)} to {DEPARTMENTS[request.to.deptId].name} · {request.to.accountCode}.{" "}
              {pending
                ? `Sent to ${PEOPLE[request.approverId].name}. Actuals stay as booked until approved and posted in the ERP.`
                : "Not sent yet."}
            </p>
          </div>
        )}

        <Section title="Coding">
          <Field label="Cost centre · GL account">{currentCoding}</Field>
          <Field label="Coding source">{CODING_SOURCE_LABEL[t.codingSource]}</Field>
          {t.poRef && <Field label="Purchase order">{t.poRef}</Field>}
          {t.invoiceRef && <Field label="Invoice">{t.invoiceRef}</Field>}
          {t.codingSource === "vendor_default" && vendorDefault && (
            <p className="mt-2 flex items-start gap-2 rounded-md bg-neutral-100 px-3 py-2 text-[13px] text-neutral-800">
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>
                Coded automatically: {t.vendor} defaults to {DEPARTMENTS[vendorDefault.deptId].name} · {vendorDefault.accountCode} since{" "}
                {dateFmt.format(new Date(vendorDefault.since))} ({vendorDefault.origin}). The invoice had no PO reference, so nobody
                reviewed the coding.
              </span>
            </p>
          )}
        </Section>

        {po && (
          <Section title="Suggested match">
            <div className="rounded-md border border-neutral-900 px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-[14px] font-semibold">
                  <Sparkles className="size-4" aria-hidden /> {po.ref}
                </span>
                <span className="text-[13px] font-medium">{formatEurExact(po.amount)}</span>
              </div>
              <p className="mt-1 text-[13.5px] text-neutral-800">{po.description}</p>
              <p className="mt-0.5 text-[13px] text-neutral-600">
                Raised by {PEOPLE[po.requesterId].name}, {PEOPLE[po.requesterId].role} · {dateFmt.format(new Date(po.raisedOn))}
              </p>
              <div className="mt-3 flex items-center gap-2 text-[13.5px]">
                <span className="text-neutral-600 line-through decoration-neutral-400">{deptId ? DEPARTMENTS[deptId].name : "Revenue"}</span>
                <ArrowRight className="size-3.5" aria-label="should be" />
                <span className="font-semibold">
                  {DEPARTMENTS[po.deptId].name} · {lineLabel(po.accountCode)}
                </span>
              </div>
              <ul className="mt-3 space-y-1 text-[13px] text-neutral-800">
                {["Same vendor", "Exact amount", ...po.matchNotes].map((r) => (
                  <li key={r} className="flex items-center gap-2">
                    <Check className="size-3.5" aria-hidden /> {r}
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex items-center gap-3">
                <Button onClick={() => setReclassOpen(true)} disabled={pending} className="h-9 px-4">
                  {pending ? "Reclassification requested" : request ? "Continue draft" : "Request reclassification"}
                </Button>
                <span className="text-[12.5px] text-neutral-500">Goes to an approver. Actuals don’t change until then.</span>
              </div>
            </div>
          </Section>
        )}

        {!po && !pending && (
          <Button variant="outline" onClick={() => setReclassOpen(true)}>
            Request reclassification
          </Button>
        )}

        {t.attachment && (
          <Section title="Attachment">
            <InvoicePreview transaction={t} attachment={t.attachment} />
          </Section>
        )}

        <Section title="Comments">
          <CommentsThread initial={t.comments ?? []} />
        </Section>

        <Separator />

        <Section title="Activity">
          <ol className="space-y-1.5 text-[13px] text-neutral-700">
            <li>Imported from ERP · today 06:00</li>
            <li>
              Coded to {currentCoding} by {CODING_SOURCE_LABEL[t.codingSource].toLowerCase()}
            </li>
            {request?.submittedAt && (
              <li className="font-medium text-neutral-950">
                {request.id} submitted by {PEOPLE[request.requesterId].name} to {PEOPLE[request.approverId].name} · just now
              </li>
            )}
          </ol>
        </Section>
      </div>

      <ReclassDialog
        open={reclassOpen}
        onOpenChange={setReclassOpen}
        transaction={t}
        suggestion={po ? { deptId: po.deptId, accountCode: po.accountCode, poRef: po.ref } : undefined}
        existing={request}
        ledger={LEDGER}
      />
    </>
  )
}
