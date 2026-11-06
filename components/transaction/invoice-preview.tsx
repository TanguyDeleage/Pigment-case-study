"use client"

import { Download, Eye } from "lucide-react"
import { toast } from "sonner"
import type { InvoiceAttachment, Transaction } from "@/lib/data"
import { formatEurExact } from "@/lib/finance/format"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" })

export function InvoicePreview({ transaction, attachment }: { transaction: Transaction; attachment: InvoiceAttachment }) {
  const total = attachment.lines.reduce((s, l) => s + l.amount, 0)
  return (
    <Dialog>
      <div className="flex items-center gap-3 rounded-xl bg-muted px-3 py-3">
        <span className="flex h-10 w-9 shrink-0 items-center justify-center rounded-md border bg-card text-[9px] font-bold text-red-600" aria-hidden>
          PDF
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13.5px] font-medium">{attachment.fileName}</span>
          <span className="block text-[12px] text-muted-foreground">Invoice · {attachment.sizeKb} KB</span>
        </span>
        <DialogTrigger asChild>
          <Button variant="outline" size="icon" className="rounded-lg" aria-label={`Preview ${attachment.fileName}`}>
            <Eye />
          </Button>
        </DialogTrigger>
        <Button
          variant="outline"
          size="icon"
          className="rounded-lg"
          aria-label={`Download ${attachment.fileName}`}
          onClick={() => toast(`Downloading ${attachment.fileName}`, { description: "Prototype: the file isn't stored locally." })}
        >
          <Download />
        </Button>
      </div>
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
                <div className="font-medium text-foreground">{attachment.note}</div>
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
