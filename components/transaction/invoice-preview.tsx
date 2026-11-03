"use client"

import { FileText } from "lucide-react"
import type { InvoiceAttachment, Transaction } from "@/lib/data"
import { formatEurExact } from "@/lib/finance/format"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" })

export function InvoiceChip({ attachment }: { attachment: InvoiceAttachment }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="flex size-9 items-center justify-center rounded-lg border bg-muted">
        <FileText className="size-4 text-muted-foreground" aria-hidden />
      </span>
      <span className="text-left">
        <span className="block text-[13.5px] font-medium">{attachment.fileName}</span>
        <span className="block text-[12px] text-muted-foreground">PDF · {attachment.sizeKb} KB · from ERP</span>
      </span>
    </span>
  )
}

export function InvoicePreview({ transaction, attachment }: { transaction: Transaction; attachment: InvoiceAttachment }) {
  const total = attachment.lines.reduce((s, l) => s + l.amount, 0)
  return (
    <Dialog>
      <DialogTrigger className="flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50">
        <InvoiceChip attachment={attachment} />
        <span className="text-[13px] font-medium underline underline-offset-4">Preview</span>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{attachment.fileName}</DialogTitle>
          <DialogDescription>Invoice attached to {transaction.id}, imported from the ERP.</DialogDescription>
        </DialogHeader>
        <article className="rounded-lg border bg-card p-6 text-[13px] text-muted-foreground shadow-xs" aria-label="Invoice">
          <div className="flex justify-between">
            <div>
              <div className="text-[18px] font-semibold tracking-tight text-foreground">{transaction.vendor.toUpperCase()}</div>
              <div className="text-muted-foreground">Supplier invoice</div>
            </div>
            <div className="text-right">
              <div className="font-semibold">Invoice {attachment.invoiceNumber}</div>
              <div className="text-muted-foreground">{dateFmt.format(new Date(attachment.issuedOn))}</div>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-4">
            <div>
              <div className="text-[11px] tracking-wide text-muted-foreground uppercase">Bill to</div>
              <div>Canvas Labs SAS</div>
              <div className="text-muted-foreground">Accounts payable, Paris</div>
            </div>
            {attachment.note && (
              <div>
                <div className="text-[11px] tracking-wide text-muted-foreground uppercase">Reference</div>
                <div className="rounded-sm bg-amber-100/70 px-1 font-medium text-foreground">{attachment.note}</div>
              </div>
            )}
          </div>
          <table className="mt-5 w-full">
            <tbody>
              {attachment.lines.map((l) => (
                <tr key={l.description} className="border-b last:border-b-0">
                  <td className="py-1.5 pr-4">{l.description}</td>
                  <td className="py-1.5 text-right">{formatEurExact(l.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-3 flex justify-between border-t pt-2 font-semibold text-foreground">
            <span>Total excl. VAT (reverse charge)</span>
            <span>{formatEurExact(total)}</span>
          </div>
        </article>
      </DialogContent>
    </Dialog>
  )
}
