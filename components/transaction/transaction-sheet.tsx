"use client"

import { useState, type ReactNode } from "react"
import { Clock, Link2, Pencil, TriangleAlert, X } from "lucide-react"
import { toast } from "sonner"
import { DEPARTMENTS, LEDGER, PEOPLE, VENDOR_DEFAULTS, lineLabel, type Transaction } from "@/lib/data"
import { findLine } from "@/lib/finance/aggregate"
import { formatEurExact } from "@/lib/finance/format"
import { requestForTransaction, useCorrections } from "@/lib/corrections/store"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CodingEditor } from "./coding-editor"
import { CODING_SOURCE_LABEL } from "./coding-source"
import { CommentsThread } from "./comments-thread"
import { InvoicePreview } from "./invoice-preview"

const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" })
const shortDateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" })
const monthYearFmt = new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric" })

function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={`grid grid-cols-[104px_1fr] items-center gap-4 text-[13.5px] ${className ?? ""}`}>
      <dt className="font-medium">{label}</dt>
      <dd className="min-w-0 text-foreground">{children}</dd>
    </div>
  )
}

function Banner({ tone, icon, title, children }: { tone: "warn" | "info"; icon: ReactNode; title: string; children: ReactNode }) {
  const styles =
    tone === "warn"
      ? "bg-amber-50 text-amber-900 [&_svg]:text-amber-700"
      : "bg-brand-soft/70 text-brand [&_p]:text-foreground/75"
  return (
    <div className={`flex gap-2.5 rounded-lg px-4 py-3.5 ${styles}`}>
      <span className="mt-0.5 shrink-0 [&_svg]:size-4">{icon}</span>
      <div>
        <div className="text-[13.5px] font-semibold">{title}</div>
        <p className="mt-1 text-[12.5px] leading-relaxed">{children}</p>
      </div>
    </div>
  )
}

export function TransactionSheet({ transaction, onClose }: { transaction: Transaction | null; onClose: () => void }) {
  return (
    <Sheet open={transaction !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        showCloseButton={false}
        className="gap-0 overflow-hidden data-[side=right]:w-[440px] data-[side=right]:max-w-full data-[side=right]:sm:max-w-[440px]"
      >
        {transaction && <TransactionPanel key={transaction.id} transaction={transaction} />}
      </SheetContent>
    </Sheet>
  )
}

function TransactionPanel({ transaction: t }: { transaction: Transaction }) {
  const [editing, setEditing] = useState(false)
  const requests = useCorrections((s) => s.requests)
  const remove = useCorrections((s) => s.remove)
  const request = requestForTransaction(requests, t.id)
  const pending = request?.status === "pending_approval" ? request : undefined

  const { deptId, accountCode } = findLine(LEDGER, t.lineId)!
  const vendorDefault = VENDOR_DEFAULTS.find((v) => v.vendor === t.vendor)
  const deptName = deptId ? DEPARTMENTS[deptId].name : "Revenue"

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast.success("Link copied")
    } catch {
      toast.error("Couldn't copy the link")
    }
  }

  const withdraw = () => {
    if (!pending) return
    remove(pending.id)
    toast("Suggestion withdrawn", { description: `${PEOPLE[pending.approverId].name} no longer needs to review it.` })
  }

  return (
    <>
      <SheetHeader className="shrink-0 gap-0 px-6 pt-6 pb-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <SheetTitle className="text-[20px] font-semibold tracking-tight">{t.vendor}</SheetTitle>
            <SheetDescription className="mt-1 font-mono text-[11.5px] text-muted-foreground">{t.id}</SheetDescription>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button variant="outline" size="icon" className="rounded-lg" onClick={copyLink} aria-label="Copy link to this transaction">
              <Link2 />
            </Button>
            <SheetClose asChild>
              <Button variant="outline" size="icon" className="rounded-lg" aria-label="Close">
                <X />
              </Button>
            </SheetClose>
          </div>
        </div>
        <div className="mt-4 text-[30px] font-semibold tracking-tight text-foreground tabular-nums">{formatEurExact(t.amount)}</div>
      </SheetHeader>

      <Tabs defaultValue="overview" className="min-h-0 flex-1 gap-0">
        <div className="shrink-0 border-b px-6 pt-3">
          <TabsList variant="line" className="h-9 gap-4 p-0">
            <TabsTrigger
              value="overview"
              className="px-0 after:bottom-[-1px] data-active:after:bg-brand group-data-horizontal/tabs:after:bottom-[-1px]"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="audit"
              className="px-0 after:bottom-[-1px] data-active:after:bg-brand group-data-horizontal/tabs:after:bottom-[-1px]"
            >
              Audit trail
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="min-h-0 space-y-6 overflow-y-auto px-6 py-6">
          <section className="space-y-4">
            {pending ? (
              <>
                <Banner tone="info" icon={<Clock />} title="Change requested · waiting for approval">
                  Sent by {PEOPLE[pending.requesterId].name}, just now. The current coding stays valid until{" "}
                  {PEOPLE[pending.approverId].name} ({PEOPLE[pending.approverId].role.toLowerCase()}) approves it.
                </Banner>
                <div className="flex justify-end">
                  <Button variant="outline" size="lg" onClick={withdraw}>
                    Withdraw suggestion
                  </Button>
                </div>
              </>
            ) : (
              t.codingSource === "vendor_default" &&
              vendorDefault && (
                <Banner tone="warn" icon={<TriangleAlert />} title="Coded automatically from the vendor default">
                  {t.vendor} has gone to {DEPARTMENTS[vendorDefault.deptId].name} since its first invoice ({vendorDefault.origin},{" "}
                  {monthYearFmt.format(new Date(vendorDefault.since))}). This invoice had no PO, so nobody reviewed it.
                </Banner>
              )
            )}

            {editing && deptId ? (
              <CodingEditor
                transaction={t}
                from={{ deptId, accountCode }}
                existing={request}
                ledger={LEDGER}
                onDone={() => setEditing(false)}
              />
            ) : (
              <>
                <dl className="space-y-3">
                  <Field label="Cost centre">
                    {deptName}
                    {pending && pending.to.deptId !== deptId && (
                      <span className="mt-1 flex items-center gap-1.5 text-[12px] text-brand">
                        <Clock className="size-3.5" aria-hidden />
                        <span>
                          Change to <span className="font-semibold">{DEPARTMENTS[pending.to.deptId].name}</span> pending approval
                        </span>
                      </span>
                    )}
                  </Field>
                  <Field label="GL account">
                    {lineLabel(accountCode)}
                    {pending && pending.to.accountCode !== accountCode && (
                      <span className="mt-1 flex items-center gap-1.5 text-[12px] text-brand">
                        <Clock className="size-3.5" aria-hidden />
                        <span>
                          Change to <span className="font-semibold">{lineLabel(pending.to.accountCode)}</span> pending approval
                        </span>
                      </span>
                    )}
                  </Field>
                </dl>
                {deptId && !pending && (
                  <div className="flex justify-end">
                    <Button size="lg" onClick={() => setEditing(true)} className="bg-brand px-3.5 text-white hover:bg-brand/90">
                      <Pencil /> {request ? "Continue draft" : "Suggest edit"}
                    </Button>
                  </div>
                )}
              </>
            )}
          </section>

          <Separator />

          <section>
            <h3 className="mb-3 text-[14px] font-semibold">Details</h3>
            <dl className="space-y-2.5 [&_dt]:font-normal [&_dt]:text-muted-foreground">
              <Field label="Date">{dateFmt.format(new Date(t.postingDate))}</Field>
              {t.location && <Field label="Location">{t.location}</Field>}
              <Field label="Vendor">{t.vendor}</Field>
              {t.dueDate !== undefined || t.paid !== undefined ? (
                <Field label="Payment">
                  {t.paid ? "Paid" : `Not paid${t.dueDate ? ` · due ${shortDateFmt.format(new Date(t.dueDate))}` : ""}`}
                </Field>
              ) : null}
              {t.poRef && <Field label="Purchase order">{t.poRef}</Field>}
            </dl>
            {t.attachment && (
              <div className="mt-4">
                <InvoicePreview transaction={t} attachment={t.attachment} />
              </div>
            )}
          </section>

          <Separator />

          <section>
            <h3 className="mb-3 text-[14px] font-semibold">Comments</h3>
            <CommentsThread initial={t.comments ?? []} />
          </section>
        </TabsContent>

        <TabsContent value="audit" className="min-h-0 overflow-y-auto px-6 py-6">
          <ol className="relative space-y-4 border-l pl-5 text-[13px]">
            <AuditItem title="Imported from ERP" meta="today 06:00" />
            <AuditItem
              title={`Coded to ${deptName} · ${lineLabel(accountCode)}`}
              meta={`${CODING_SOURCE_LABEL[t.codingSource]}${t.codingSource === "vendor_default" ? " · not reviewed" : ""}`}
            />
            {t.comments?.map((c) => (
              <AuditItem key={c.id} title={`${PEOPLE[c.authorId].name} commented`} meta={dateFmt.format(new Date(c.at))} />
            ))}
            {pending && (
              <AuditItem
                highlight
                title={`${PEOPLE[pending.requesterId].name} suggested ${DEPARTMENTS[pending.to.deptId].name} · ${lineLabel(pending.to.accountCode)}`}
                meta={`${pending.id} · sent to ${PEOPLE[pending.approverId].name} · just now`}
                reason={pending.comment}
              />
            )}
          </ol>
        </TabsContent>
      </Tabs>
    </>
  )
}

function AuditItem({ title, meta, highlight, reason }: { title: string; meta: string; highlight?: boolean; reason?: string }) {
  return (
    <li className="relative">
      <span
        className={`absolute top-1.5 -left-[25px] size-2 rounded-full ring-4 ring-popover ${highlight ? "bg-brand" : "bg-muted-foreground/40"}`}
        aria-hidden
      />
      <div className={highlight ? "font-medium text-foreground" : "text-foreground"}>{title}</div>
      <div className="text-[12px] text-muted-foreground">{meta}</div>
      {reason && <p className="mt-1.5 rounded-md bg-muted px-3 py-2 text-[12.5px] text-foreground/80">{reason}</p>}
    </li>
  )
}
